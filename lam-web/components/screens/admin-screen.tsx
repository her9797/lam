"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import type { MenuCategory, MenuItem, NoticeItem } from "@/data/menu-data";
import {
  createCategory,
  createMenuItem,
  createNotice,
  createRequestGuide,
  deleteCategory as deleteCategoryApi,
  deleteMenuItem,
  deleteNotice as deleteNoticeApi,
  deleteRequestGuide,
  uploadMenuImage,
} from "@/services/admin-service";
import type { AppData } from "@/services/app-service";

type MenuFormState = {
  categoryId: string;
  badge: string;
  name: string;
  description: string;
  price: string;
  isVisible: boolean;
};

type CategoryFormState = {
  id: string;
  label: string;
  isVisible: boolean;
};

type NoticeFormState = {
  text: string;
  isVisible: boolean;
};

type EditableCategoryState = {
  id: string;
  label: string;
};

type EditableMenuState = {
  categoryId: string;
  badge: string;
  name: string;
  description: string;
  price: string;
};

type CropDraftState = {
  file: File;
  imageUrl: string;
  transform: CropTransformState;
};

type CropTransformState = {
  scale: number;
  offsetX: number;
  offsetY: number;
  baseWidth: number;
  baseHeight: number;
  naturalWidth: number;
  naturalHeight: number;
};

type AdminScreenProps = {
  initialData: AppData;
};

const adminSections = [
  { id: "category", label: "카테고리", kicker: "category", title: "카테고리 만들기" },
  { id: "menu", label: "메뉴", kicker: "menu", title: "메뉴 등록" },
  { id: "request", label: "요청사항", kicker: "request", title: "요청사항 작성" },
  { id: "event", label: "이벤트", kicker: "event", title: "이벤트/공지 작성" },
] as const;

const defaultCategoryForm: CategoryFormState = {
  id: "",
  label: "",
  isVisible: true,
};

const defaultNoticeForm: NoticeFormState = {
  text: "",
  isVisible: true,
};

function defaultMenuForm(categoryId: string): MenuFormState {
  return {
    categoryId,
    badge: "",
    name: "",
    description: "",
    price: "",
    isVisible: true,
  };
}

function slugifyCategoryId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createEditableCategory(category: MenuCategory): EditableCategoryState {
  return {
    id: category.id,
    label: category.label,
  };
}

function createEditableMenu(item: MenuItem): EditableMenuState {
  return {
    categoryId: item.categoryId,
    badge: item.badge ?? "",
    name: item.name,
    description: item.description,
    price: item.price,
  };
}

function getPrimaryMenuImage(item: MenuItem) {
  return item.images?.find((image) => image.isPrimary) ?? item.images?.[0];
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

const CROP_FRAME_SIZE = 280;

function clampCropTransform(transform: CropTransformState): CropTransformState {
  const scaledWidth = transform.baseWidth * transform.scale;
  const scaledHeight = transform.baseHeight * transform.scale;
  const minX = Math.min(0, CROP_FRAME_SIZE - scaledWidth);
  const minY = Math.min(0, CROP_FRAME_SIZE - scaledHeight);

  return {
    ...transform,
    offsetX: Math.min(0, Math.max(minX, transform.offsetX)),
    offsetY: Math.min(0, Math.max(minY, transform.offsetY)),
  };
}

async function createCropDraft(file: File): Promise<CropDraftState> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(imageUrl);
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const baseWidth = aspectRatio >= 1 ? CROP_FRAME_SIZE * aspectRatio : CROP_FRAME_SIZE;
    const baseHeight = aspectRatio >= 1 ? CROP_FRAME_SIZE : CROP_FRAME_SIZE / aspectRatio;
    const transform = clampCropTransform({
      scale: 1,
      offsetX: (CROP_FRAME_SIZE - baseWidth) / 2,
      offsetY: (CROP_FRAME_SIZE - baseHeight) / 2,
      baseWidth,
      baseHeight,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    });

    return {
      file,
      imageUrl,
      transform,
    };
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    throw error;
  }
}

async function cropImageFile(file: File, transform: CropTransformState) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 560;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("이미지 편집 컨텍스트를 만들 수 없습니다.");
    }

    const normalizedTransform = clampCropTransform(transform);
    const sourceX = Math.max(0, (-normalizedTransform.offsetX / (normalizedTransform.baseWidth * normalizedTransform.scale)) * image.naturalWidth);
    const sourceY = Math.max(0, (-normalizedTransform.offsetY / (normalizedTransform.baseHeight * normalizedTransform.scale)) * image.naturalHeight);
    const sourceWidth = Math.min(
      image.naturalWidth - sourceX,
      (CROP_FRAME_SIZE / (normalizedTransform.baseWidth * normalizedTransform.scale)) * image.naturalWidth,
    );
    const sourceHeight = Math.min(
      image.naturalHeight - sourceY,
      (CROP_FRAME_SIZE / (normalizedTransform.baseHeight * normalizedTransform.scale)) * image.naturalHeight,
    );

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type || "image/png", 0.92);
    });

    if (!blob) {
      throw new Error("이미지를 잘라내는 데 실패했습니다.");
    }

    return new File([blob], file.name, { type: blob.type || file.type || "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function AdminScreen({ initialData }: AdminScreenProps) {
  const [appData, setAppData] = useState<AppData>(initialData);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [menuForm, setMenuForm] = useState<MenuFormState>(defaultMenuForm(initialData.categories[0]?.id ?? ""));
  const [requestForm, setRequestForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [statusMessage, setStatusMessage] = useState<string>("");
  useEffect(() => {
  if (!statusMessage) {
    return;
  }

  const timer = window.setTimeout(() => {
    setStatusMessage("");
  }, 2000);

  return () => window.clearTimeout(timer);
}, [statusMessage]);
  const [activeSection, setActiveSection] = useState<(typeof adminSections)[number]["id"]>("category");
  const [sliderHeight, setSliderHeight] = useState<number>(0);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<EditableCategoryState>(defaultCategoryForm);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingMenu, setEditingMenu] = useState<EditableMenuState>(defaultMenuForm(initialData.categories[0]?.id ?? ""));
  const [editingMenuCropDraft, setEditingMenuCropDraft] = useState<CropDraftState | null>(null);
  const [menuManageCategoryId, setMenuManageCategoryId] = useState<string>("all");
  const [newMenuCropDraft, setNewMenuCropDraft] = useState<CropDraftState | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestText, setEditingRequestText] = useState<string>("");
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingNoticeText, setEditingNoticeText] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryOptions = useMemo(() => appData.categories, [appData.categories]);
  const managedMenuItems = useMemo(() => {
    if (menuManageCategoryId === "all") {
      return appData.items;
    }

    return appData.items.filter((item) => item.categoryId === menuManageCategoryId);
  }, [appData.items, menuManageCategoryId]);

  useEffect(() => {
    return () => {
      if (newMenuCropDraft?.imageUrl) {
        URL.revokeObjectURL(newMenuCropDraft.imageUrl);
      }
      if (editingMenuCropDraft?.imageUrl) {
        URL.revokeObjectURL(editingMenuCropDraft.imageUrl);
      }
    };
  }, [editingMenuCropDraft, newMenuCropDraft]);

  function applyNextData(nextData: AppData) {
    setAppData(nextData);
    setMenuForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextData.categories[0]?.id || "",
    }));
    setMenuManageCategoryId((current) => {
      if (current === "all") {
        return current;
      }

      return nextData.categories.some((category) => category.id === current) ? current : "all";
    });
  }

  function scrollToSection(sectionId: (typeof adminSections)[number]["id"]) {
    const slider = sliderRef.current;
    const nextSlide = slideRefs.current[sectionId];
    if (!slider || !nextSlide) {
      return;
    }

    slider.scrollTo({
      left: nextSlide.offsetLeft,
      behavior: "smooth",
    });
    setActiveSection(sectionId);
  }

  function handleSliderScroll() {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    let nearestSectionId = activeSection;
    let nearestDistance = Number.POSITIVE_INFINITY;

    adminSections.forEach((section) => {
      const element = slideRefs.current[section.id];
      if (!element) {
        return;
      }

      const distance = Math.abs(slider.scrollLeft - element.offsetLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSectionId = section.id;
      }
    });

    if (nearestSectionId !== activeSection) {
      setActiveSection(nearestSectionId);
    }
  }

  useEffect(() => {
    const activeSlide = slideRefs.current[activeSection];
    if (!activeSlide) {
      return;
    }

    const updateHeight = () => {
      setSliderHeight(activeSlide.offsetHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(activeSlide);

    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [
    activeSection,
    appData,
    editingCategoryId,
    editingMenuId,
    editingNoticeId,
    editingRequestId,
    menuManageCategoryId,
  ]);

  function beginCategoryEdit(category: MenuCategory) {
    setEditingCategoryId(category.id);
    setEditingCategory(createEditableCategory(category));
  }

  function cancelCategoryEdit() {
    setEditingCategoryId(null);
    setEditingCategory(defaultCategoryForm);
  }

  function saveCategoryEdit(categoryId: string) {
    const normalizedId = slugifyCategoryId(editingCategory.id || editingCategory.label);
    const normalizedLabel = editingCategory.label.trim();

    if (!normalizedId || !normalizedLabel) {
      setStatusMessage("카테고리 ID와 이름을 확인해주세요.");
      return;
    }

    setAppData((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, id: normalizedId, label: normalizedLabel } : category,
      ),
      items: current.items.map((item) =>
        item.categoryId === categoryId ? { ...item, categoryId: normalizedId } : item,
      ),
    }));
    setMenuForm((current) => ({
      ...current,
      categoryId: current.categoryId === categoryId ? normalizedId : current.categoryId,
    }));
    setMenuManageCategoryId((current) => (current === categoryId ? normalizedId : current));
    cancelCategoryEdit();
    setStatusMessage("카테고리 수정 UI를 반영했습니다.");
  }

  function deleteCategory(categoryId: string) {
    startTransition(async () => {
      try {
        const nextData = await deleteCategoryApi(categoryId);

        applyNextData(nextData);

        setEditingCategoryId((current) =>
          current === categoryId ? null : current,
        );

        setStatusMessage("카테고리를 삭제했습니다.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "카테고리 삭제에 실패했습니다.",
        );
      }
    });
  }

  function beginMenuEdit(item: MenuItem) {
    setEditingMenuId(item.id);
    setEditingMenu(createEditableMenu(item));
    setEditingMenuCropDraft((current) => {
      if (current?.imageUrl) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return null;
    });
  }

  function cancelMenuEdit() {
    setEditingMenuId(null);
    setEditingMenu(defaultMenuForm(categoryOptions[0]?.id ?? ""));
    setEditingMenuCropDraft((current) => {
      if (current?.imageUrl) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return null;
    });
  }

  function saveMenuEdit(menuId: string) {
    if (!editingMenu.categoryId || !editingMenu.name.trim() || !editingMenu.description.trim() || !editingMenu.price.trim()) {
      setStatusMessage("메뉴 수정 필수 항목을 확인해주세요.");
      return;
    }

    const nextBadge = editingMenu.badge.trim() || undefined;
    const nextName = editingMenu.name.trim();
    const nextDescription = editingMenu.description.trim();
    const nextPrice = editingMenu.price.trim();
    const nextCategoryId = editingMenu.categoryId;

    setAppData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === menuId
          ? {
              ...item,
              categoryId: nextCategoryId,
              badge: nextBadge,
              name: nextName,
              description: nextDescription,
              price: nextPrice,
            }
          : item,
      ),
    }));

    if (editingMenuCropDraft) {
      startTransition(async () => {
        try {
          const item = appData.items.find((candidate) => candidate.id === menuId);
          const croppedImage = await cropImageFile(
            editingMenuCropDraft.file,
            editingMenuCropDraft.transform,
          );
          const nextData = await uploadMenuImage({
            menuItemId: menuId,
            image: croppedImage,
            isPrimary: true,
            displayArea: "menu",
          });
          applyNextData(nextData);
          setAppData((current) => ({
            ...current,
            items: current.items.map((currentItem) =>
              currentItem.id === menuId
                ? {
                    ...currentItem,
                    categoryId: nextCategoryId,
                    badge: nextBadge,
                    name: nextName,
                    description: nextDescription,
                    price: nextPrice,
                  }
                : currentItem,
            ),
          }));
          setStatusMessage("메뉴 수정과 이미지 영역 저장을 반영했습니다.");
        } catch (error) {
          setStatusMessage(error instanceof Error ? error.message : "메뉴 이미지 저장에 실패했습니다.");
        } finally {
          cancelMenuEdit();
        }
      });
      return;
    }

    cancelMenuEdit();
    setStatusMessage("메뉴 수정 UI를 반영했습니다.");
  }

  function deleteMenu(menuId: string) {
  startTransition(async () => {
    try {
      const nextData = await deleteMenuItem(menuId);

      applyNextData(nextData);
      setEditingMenuId((current) => (current === menuId ? null : current));
      setStatusMessage("메뉴를 삭제했습니다.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "메뉴 삭제에 실패했습니다.",
      );
    }
  });
}

  function handleExistingMenuImageChange(_menuId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    void (async () => {
      try {
        const nextDraft = await createCropDraft(file);
        setEditingMenuCropDraft((current) => {
          if (current?.imageUrl) {
            URL.revokeObjectURL(current.imageUrl);
          }

          return nextDraft;
        });
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "이미지를 불러오지 못했습니다.");
      }
    })();
    event.target.value = "";
  }

  function beginNoticeEdit(item: NoticeItem, type: "request" | "notice") {
    if (type === "request") {
      setEditingRequestId(item.id);
      setEditingRequestText(item.text);
      return;
    }

    setEditingNoticeId(item.id);
    setEditingNoticeText(item.text);
  }

  function cancelNoticeEdit(type: "request" | "notice") {
    if (type === "request") {
      setEditingRequestId(null);
      setEditingRequestText("");
      return;
    }

    setEditingNoticeId(null);
    setEditingNoticeText("");
  }

  function saveNoticeEdit(itemId: string, type: "request" | "notice") {
    const nextText = (type === "request" ? editingRequestText : editingNoticeText).trim();
    if (!nextText) {
      setStatusMessage("문구를 입력해주세요.");
      return;
    }

    setAppData((current) => ({
      ...current,
      requestGuides:
        type === "request"
          ? current.requestGuides.map((item) => (item.id === itemId ? { ...item, text: nextText } : item))
          : current.requestGuides,
      notices:
        type === "notice"
          ? current.notices.map((item) => (item.id === itemId ? { ...item, text: nextText } : item))
          : current.notices,
    }));
    cancelNoticeEdit(type);
    setStatusMessage(type === "request" ? "요청사항 수정 UI를 반영했습니다." : "이벤트 수정 UI를 반영했습니다.");
  }

  function deleteNotice(itemId: string, type: "request" | "notice") {
    startTransition(async () => {
      try {
        const nextData =
          type === "request"
            ? await deleteRequestGuide(itemId)
            : await deleteNoticeApi(itemId);

        applyNextData(nextData);
        cancelNoticeEdit(type);

        setStatusMessage(
          type === "request"
            ? "요청사항을 삭제했습니다."
            : "이벤트/공지를 삭제했습니다.",
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : type === "request"
              ? "요청사항 삭제에 실패했습니다."
              : "이벤트/공지 삭제에 실패했습니다.",
        );
      }
    });
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedId = slugifyCategoryId(categoryForm.id || categoryForm.label);
    const normalizedLabel = categoryForm.label.trim();
    if (!normalizedId || !normalizedLabel) {
      setStatusMessage("카테고리 ID와 이름을 확인해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const nextData = await createCategory({ id: normalizedId, label: normalizedLabel, isVisible: categoryForm.isVisible });
        applyNextData(nextData);
        setCategoryForm(defaultCategoryForm);
        setStatusMessage("카테고리를 저장했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "카테고리 저장에 실패했습니다.");
      }
    });
  }

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!menuForm.categoryId || !menuForm.name.trim() || !menuForm.description.trim() || !menuForm.price.trim()) {
      setStatusMessage("메뉴 필수 항목을 모두 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const previousMenuIds = new Set(appData.items.map((item) => item.id));
        let nextData = await createMenuItem({
          categoryId: menuForm.categoryId,
          badge: menuForm.badge.trim(),
          name: menuForm.name.trim(),
          description: menuForm.description.trim(),
          price: menuForm.price.trim(),
          isVisible: menuForm.isVisible,
        });

        if (newMenuCropDraft) {
          const createdMenuItem = nextData.items.find((item) => !previousMenuIds.has(item.id));
          if (createdMenuItem) {
            const croppedImage = await cropImageFile(
              newMenuCropDraft.file,
              newMenuCropDraft.transform,
            );
            nextData = await uploadMenuImage({
              menuItemId: createdMenuItem.id,
              image: croppedImage,
              isPrimary: true,
              displayArea: "menu",
            });
          }
        }

        applyNextData(nextData);
        setMenuForm(defaultMenuForm(menuForm.categoryId));
        setNewMenuCropDraft((current) => {
          if (current?.imageUrl) {
            URL.revokeObjectURL(current.imageUrl);
          }
          return null;
        });
        setStatusMessage("메뉴를 저장했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "메뉴 저장에 실패했습니다.");
      }
    });
  }

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestForm.text.trim()) {
      setStatusMessage("요청사항 문구를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const nextData = await createRequestGuide({ text: requestForm.text.trim(), isVisible: requestForm.isVisible });
        applyNextData(nextData);
        setRequestForm(defaultNoticeForm);
        setStatusMessage("요청사항을 저장했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "요청사항 저장에 실패했습니다.");
      }
    });
  }

  function handleNoticeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noticeForm.text.trim()) {
      setStatusMessage("공지 문구를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const nextData = await createNotice({ text: noticeForm.text.trim(), isVisible: noticeForm.isVisible });
        applyNextData(nextData);
        setNoticeForm(defaultNoticeForm);
        setStatusMessage("공지/이벤트를 저장했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "공지 저장에 실패했습니다.");
      }
    });
  }

  return (
    <main className="page-shell admin-shell">
      <FloatingHomeBadge />
      <ScrollTopButton />
      <div className="phone-frame admin-frame">

        <div className="admin-tabs" role="tablist" aria-label="운영 관리 섹션">
          {adminSections.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeSection === section.id}
              className={activeSection === section.id ? "admin-tab active" : "admin-tab"}
              onClick={() => scrollToSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div
          ref={sliderRef}
          className="admin-slider"
          onScroll={handleSliderScroll}
          style={sliderHeight > 0 ? { height: sliderHeight } : undefined}
        >
          <section
            ref={(element) => {
              slideRefs.current.category = element;
            }}
            className="content-card admin-card admin-slide"
          >
            <div className="section-header">
              <div>
                <p className="section-kicker">category</p>
                <h2>카테고리 만들기</h2>
              </div>
            </div>
            <form className="admin-form" onSubmit={handleCategorySubmit}>
              <label className="admin-field">
                <span>카테고리 ID</span>
                <input value={categoryForm.id} onChange={(event) => setCategoryForm((current) => ({ ...current, id: event.target.value }))} placeholder="예: cocktail" />
              </label>
              <label className="admin-field">
                <span>카테고리 이름</span>
                <input value={categoryForm.label} onChange={(event) => setCategoryForm((current) => ({ ...current, label: event.target.value }))} placeholder="예: 칵테일" />
              </label>
              <button className="admin-button" type="submit" disabled={isPending}>카테고리 추가</button>
            </form>
            <div className="admin-manage-section">
              <div className="admin-manage-header">
                <strong>기존 카테고리 관리</strong>
                <span>{categoryOptions.length}개</span>
              </div>
              <div className="admin-manage-list">
                {categoryOptions.map((category) => {
                  const isEditing = editingCategoryId === category.id;

                  return (
                    <article key={category.id} className="admin-manage-card">
                      {isEditing ? (
                        <div className="admin-inline-form">
                          <label className="admin-field">
                            <span>카테고리 ID</span>
                            <input value={editingCategory.id} onChange={(event) => setEditingCategory((current) => ({ ...current, id: event.target.value }))} />
                          </label>
                          <label className="admin-field">
                            <span>카테고리 이름</span>
                            <input value={editingCategory.label} onChange={(event) => setEditingCategory((current) => ({ ...current, label: event.target.value }))} />
                          </label>
                          <div className="admin-inline-actions">
                            <button type="button" className="admin-small-button" onClick={() => saveCategoryEdit(category.id)}>저장</button>
                            <button type="button" className="admin-ghost-button" onClick={cancelCategoryEdit}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="admin-manage-copy">
                            <strong>{category.label}</strong>
                            <p>{category.id}</p>
                          </div>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-ghost-button" onClick={() => beginCategoryEdit(category)}>수정</button>
                            <button type="button" className="admin-danger-button" onClick={() => deleteCategory(category.id)}>삭제</button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            ref={(element) => {
              slideRefs.current.menu = element;
            }}
            className="content-card admin-card admin-slide"
          >
            <div className="section-header">
              <div>
                <p className="section-kicker">menu</p>
                <h2>메뉴 관리</h2>
              </div>
            </div>
            <div className="admin-manage-section">
              <div className="admin-manage-header">
                <strong>등록된 메뉴 관리</strong>
                <span>{managedMenuItems.length}개</span>
              </div>
              <div className="admin-filter-row">
                <button
                  type="button"
                  className={menuManageCategoryId === "all" ? "admin-filter-chip active" : "admin-filter-chip"}
                  onClick={() => setMenuManageCategoryId("all")}
                >
                  전체
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={menuManageCategoryId === category.id ? "admin-filter-chip active" : "admin-filter-chip"}
                    onClick={() => setMenuManageCategoryId(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="admin-manage-list">
                {managedMenuItems.map((item) => {
                  const itemCategory = categoryOptions.find((category) => category.id === item.categoryId);
                  const isEditing = editingMenuId === item.id;

                  return (
                    <article key={item.id} className="admin-manage-card">
                      {isEditing ? (
                        <>
                          <div className="admin-manage-copy">
                            <div className="admin-manage-meta admin-manage-meta-edit">
                              <label className="admin-field admin-field-chip">
                                <span className="sr-only">카테고리</span>
                                <select value={editingMenu.categoryId} onChange={(event) => setEditingMenu((current) => ({ ...current, categoryId: event.target.value }))}>
                                  {categoryOptions.map((category) => (
                                    <option key={category.id} value={category.id}>{category.label}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="admin-menu-row">
                              <div className="admin-image-block admin-image-block-inline">
                                <label className="admin-image-editor admin-image-editor-inline">
                                  <input type="file" accept="image/*" className="admin-image-input" onChange={(event) => handleExistingMenuImageChange(item.id, event)} />
                                  {editingMenuCropDraft ? (
                                    <div className="admin-menu-image-empty admin-menu-image-empty-inline">크롭</div>
                                  ) : getPrimaryMenuImage(item) ? (
                                    <img
                                      src={getPrimaryMenuImage(item)?.contentUrl}
                                      alt={editingMenu.name || item.name}
                                      className="admin-menu-image-preview admin-menu-image-preview-inline"
                                      style={{ objectPosition: `${getPrimaryMenuImage(item)?.focusX ?? 50}% ${getPrimaryMenuImage(item)?.focusY ?? 50}%` }}
                                    />
                                  ) : (
                                    <div className="admin-menu-image-empty admin-menu-image-empty-inline">사진</div>
                                  )}
                                  <span className="admin-image-edit-badge admin-image-edit-badge-inline">수정</span>
                                </label>
                              </div>
                              <div className="admin-menu-copy">
                                <label className="admin-field admin-field-inline-badge">
                                  <span className="sr-only">배지</span>
                                  <input
                                    value={editingMenu.badge}
                                    onChange={(event) => setEditingMenu((current) => ({ ...current, badge: event.target.value }))}
                                    placeholder="badge"
                                  />
                                </label>
                                <label className="admin-field admin-field-inline-title">
                                  <span className="sr-only">메뉴명</span>
                                  <input value={editingMenu.name} onChange={(event) => setEditingMenu((current) => ({ ...current, name: event.target.value }))} />
                                </label>
                                <label className="admin-field admin-field-inline-body">
                                  <span className="sr-only">설명</span>
                                  <textarea value={editingMenu.description} onChange={(event) => setEditingMenu((current) => ({ ...current, description: event.target.value }))} />
                                </label>
                                {editingMenuCropDraft ? (
                                  <ImageCropEditor
                                    imageUrl={editingMenuCropDraft.imageUrl}
                                    transform={editingMenuCropDraft.transform}
                                    onTransformChange={(transform) =>
                                      setEditingMenuCropDraft((current) => (current ? { ...current, transform } : current))
                                    }
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="admin-manage-side">
                            <label className="admin-field admin-field-inline-price">
                              <span className="sr-only">가격</span>
                              <input value={editingMenu.price} onChange={(event) => setEditingMenu((current) => ({ ...current, price: event.target.value }))} />
                            </label>
                            <div className="admin-row-actions">
                              <button type="button" className="admin-small-button" onClick={() => saveMenuEdit(item.id)}>저장</button>
                              <button type="button" className="admin-ghost-button" onClick={cancelMenuEdit}>취소</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="admin-manage-copy">
                            <div className="admin-manage-meta">
                              <span>{itemCategory?.label ?? item.categoryId}</span>
                              {item.badge ? <span>{item.badge}</span> : null}
                            </div>
                            <div className="admin-menu-row">
                              <div className="admin-image-block admin-image-block-inline">
                                <div className="admin-image-editor admin-image-editor-inline admin-image-editor-readonly">
                                  {getPrimaryMenuImage(item) ? (
                                    <img
                                      src={getPrimaryMenuImage(item)?.contentUrl}
                                      alt={item.name}
                                      className="admin-menu-image-preview admin-menu-image-preview-inline"
                                      style={{ objectPosition: `${getPrimaryMenuImage(item)?.focusX ?? 50}% ${getPrimaryMenuImage(item)?.focusY ?? 50}%` }}
                                    />
                                  ) : (
                                    <div className="admin-menu-image-empty admin-menu-image-empty-inline">사진</div>
                                  )}
                                </div>
                              </div>
                              <div className="admin-menu-copy">
                                <strong>{item.name}</strong>
                                <p>{item.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="admin-manage-side">
                            <strong>{item.price}</strong>
                            <div className="admin-row-actions">
                              <button type="button" className="admin-ghost-button" onClick={() => beginMenuEdit(item)}>수정</button>
                              <button type="button" className="admin-danger-button" onClick={() => deleteMenu(item.id)}>삭제</button>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="admin-manage-section">
              <div className="admin-manage-header">
                <strong>새 메뉴 등록</strong>
              </div>
              <form className="admin-form" onSubmit={handleMenuSubmit}>
                <label className="admin-field">
                  <span>카테고리</span>
                  <select value={menuForm.categoryId} onChange={(event) => setMenuForm((current) => ({ ...current, categoryId: event.target.value }))}>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>배지</span>
                  <input value={menuForm.badge} onChange={(event) => setMenuForm((current) => ({ ...current, badge: event.target.value }))} placeholder="예: signature" />
                </label>
                <label className="admin-field admin-field-wide">
                  <span>메뉴명</span>
                  <input value={menuForm.name} onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))} placeholder="예: 하우스 진토닉" />
                </label>
                <label className="admin-field admin-field-wide">
                  <span>설명</span>
                  <textarea value={menuForm.description} onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))} placeholder="메뉴 설명을 입력하세요" />
                </label>
                <label className="admin-field">
                  <span>가격</span>
                  <input value={menuForm.price} onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))} placeholder="예: 11,000원" />
                </label>
                <div className="admin-field admin-field-wide">
                  <span>메뉴 사진</span>
                  <label className="admin-image-editor admin-image-editor-form">
                    <input
                      type="file"
                      accept="image/*"
                      className="admin-image-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void (async () => {
                          if (!file) {
                            setNewMenuCropDraft((current) => {
                              if (current?.imageUrl) {
                                URL.revokeObjectURL(current.imageUrl);
                              }

                              return null;
                            });
                            return;
                          }

                          try {
                            const nextDraft = await createCropDraft(file);
                            setNewMenuCropDraft((current) => {
                              if (current?.imageUrl) {
                                URL.revokeObjectURL(current.imageUrl);
                              }

                              return nextDraft;
                            });
                          } catch (error) {
                            setStatusMessage(error instanceof Error ? error.message : "이미지를 불러오지 못했습니다.");
                          }
                        })();
                      }}
                    />
                    {newMenuCropDraft ? (
                      <div className="admin-menu-image-empty">크롭 영역 선택</div>
                    ) : (
                      <div className="admin-menu-image-empty">사진 영역 클릭해서 등록</div>
                    )}
                    <span className="admin-image-edit-badge">사진 선택</span>
                  </label>
                  <small className="admin-field-help">{newMenuCropDraft?.file.name ?? "선택된 파일 없음"}</small>
                  {newMenuCropDraft ? (
                    <ImageCropEditor
                      imageUrl={newMenuCropDraft.imageUrl}
                      transform={newMenuCropDraft.transform}
                      onTransformChange={(transform) =>
                        setNewMenuCropDraft((current) => (current ? { ...current, transform } : current))
                      }
                    />
                  ) : null}
                </div>
                <button className="admin-button" type="submit" disabled={isPending}>메뉴 추가</button>
              </form>
            </div>
          </section>

          <section
            ref={(element) => {
              slideRefs.current.request = element;
            }}
            className="content-card admin-card admin-slide"
          >
            <div className="section-header">
              <div>
                <p className="section-kicker">request</p>
                <h2>요청사항 작성</h2>
              </div>
            </div>
            <form className="admin-form single-column" onSubmit={handleRequestSubmit}>
              <label className="admin-field admin-field-wide">
                <span>안내 문구</span>
                <textarea value={requestForm.text} onChange={(event) => setRequestForm((current) => ({ ...current, text: event.target.value }))} placeholder="예: 알레르기 유발 재료가 있으면 주문 전 꼭 말씀해주세요." />
              </label>
              <button className="admin-button" type="submit" disabled={isPending}>요청사항 추가</button>
            </form>
            <div className="admin-manage-section">
              <div className="admin-manage-header">
                <strong>등록된 요청사항 관리</strong>
                <span>{appData.requestGuides.length}개</span>
              </div>
              <div className="admin-manage-list">
                {appData.requestGuides.map((guide) => {
                  const isEditing = editingRequestId === guide.id;

                  return (
                    <article key={guide.id} className="admin-manage-card admin-manage-card-stack">
                      {isEditing ? (
                        <div className="admin-inline-form">
                          <label className="admin-field admin-field-wide">
                            <span>안내 문구</span>
                            <textarea value={editingRequestText} onChange={(event) => setEditingRequestText(event.target.value)} />
                          </label>
                          <div className="admin-inline-actions">
                            <button type="button" className="admin-small-button" onClick={() => saveNoticeEdit(guide.id, "request")}>저장</button>
                            <button type="button" className="admin-ghost-button" onClick={() => cancelNoticeEdit("request")}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="admin-manage-text">{guide.text}</p>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-ghost-button" onClick={() => beginNoticeEdit(guide, "request")}>수정</button>
                            <button type="button" className="admin-danger-button" onClick={() => deleteNotice(guide.id, "request")}>삭제</button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            ref={(element) => {
              slideRefs.current.event = element;
            }}
            className="content-card admin-card admin-slide"
          >
            <div className="section-header">
              <div>
                <p className="section-kicker">event</p>
                <h2>이벤트/공지 작성</h2>
              </div>
            </div>
            <form className="admin-form single-column" onSubmit={handleNoticeSubmit}>
              <label className="admin-field admin-field-wide">
                <span>공지 문구</span>
                <textarea value={noticeForm.text} onChange={(event) => setNoticeForm((current) => ({ ...current, text: event.target.value }))} placeholder="예: 매주 수요일 하이볼 1,000원 할인" />
              </label>
              <button className="admin-button" type="submit" disabled={isPending}>공지 추가</button>
            </form>
            <div className="admin-manage-section">
              <div className="admin-manage-header">
                <strong>등록된 이벤트/공지 관리</strong>
                <span>{appData.notices.length}개</span>
              </div>
              <div className="admin-manage-list">
                {appData.notices.map((notice) => {
                  const isEditing = editingNoticeId === notice.id;

                  return (
                    <article key={notice.id} className="admin-manage-card admin-manage-card-stack">
                      {isEditing ? (
                        <div className="admin-inline-form">
                          <label className="admin-field admin-field-wide">
                            <span>공지 문구</span>
                            <textarea value={editingNoticeText} onChange={(event) => setEditingNoticeText(event.target.value)} />
                          </label>
                          <div className="admin-inline-actions">
                            <button type="button" className="admin-small-button" onClick={() => saveNoticeEdit(notice.id, "notice")}>저장</button>
                            <button type="button" className="admin-ghost-button" onClick={() => cancelNoticeEdit("notice")}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="admin-manage-text">{notice.text}</p>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-ghost-button" onClick={() => beginNoticeEdit(notice, "notice")}>수정</button>
                            <button type="button" className="admin-danger-button" onClick={() => deleteNotice(notice.id, "notice")}>삭제</button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
            {statusMessage ? (
        <div className="admin-toast" role="status" aria-live="polite">
          {statusMessage}
        </div>
      ) : null}
    </main>
  );
}

type ImageCropEditorProps = {
  imageUrl: string;
  transform: CropTransformState;
  onTransformChange: (transform: CropTransformState) => void;
};

function ImageCropEditor({ imageUrl, transform, onTransformChange }: ImageCropEditorProps) {
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);

  function updateScale(nextScale: number) {
    const clampedScale = Math.min(3, Math.max(1, nextScale));
    const centerX = CROP_FRAME_SIZE / 2;
    const centerY = CROP_FRAME_SIZE / 2;
    const currentWidth = transform.baseWidth * transform.scale;
    const currentHeight = transform.baseHeight * transform.scale;
    const nextWidth = transform.baseWidth * clampedScale;
    const nextHeight = transform.baseHeight * clampedScale;
    const relativeCenterX = (centerX - transform.offsetX) / currentWidth;
    const relativeCenterY = (centerY - transform.offsetY) / currentHeight;
    const nextTransform = clampCropTransform({
      ...transform,
      scale: clampedScale,
      offsetX: centerX - nextWidth * relativeCenterX,
      offsetY: centerY - nextHeight * relativeCenterY,
    });

    onTransformChange(nextTransform);
  }

  return (
    <div className="crop-editor">
      <div
        className="crop-editor-frame"
        onPointerDown={(event) => {
          dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: transform.offsetX,
            offsetY: transform.offsetY,
          };
        }}
        onPointerMove={(event) => {
          const dragStart = dragStartRef.current;
          if (!dragStart) {
            return;
          }
          const nextTransform = clampCropTransform({
            ...transform,
            offsetX: dragStart.offsetX + (event.clientX - dragStart.pointerX),
            offsetY: dragStart.offsetY + (event.clientY - dragStart.pointerY),
          });
          onTransformChange(nextTransform);
        }}
        onPointerUp={() => {
          dragStartRef.current = null;
        }}
        onPointerLeave={() => {
          dragStartRef.current = null;
        }}
      >
        <img
          src={imageUrl}
          alt="크롭 편집 이미지"
          className="crop-editor-image crop-editor-image-draggable"
          style={{
            width: transform.baseWidth * transform.scale,
            height: transform.baseHeight * transform.scale,
            transform: `translate(${transform.offsetX}px, ${transform.offsetY}px)`,
          }}
        />
        <div className="crop-editor-selection crop-editor-selection-fixed" />
      </div>
      <div className="crop-editor-footer">
        <p className="crop-editor-help">고정된 영역에 맞게 이미지를 드래그하고 확대/축소하세요.</p>
        <label className="crop-editor-zoom">
          <span>확대</span>
          <input type="range" min="1" max="3" step="0.01" value={transform.scale} onChange={(event) => updateScale(Number(event.target.value))} />
        </label>
        <div className="crop-editor-preview">
          <div
            className="crop-editor-preview-image"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${(transform.baseWidth * transform.scale * 56) / CROP_FRAME_SIZE}px ${(transform.baseHeight * transform.scale * 56) / CROP_FRAME_SIZE}px`,
              backgroundPosition: `${(transform.offsetX * 56) / CROP_FRAME_SIZE}px ${(transform.offsetY * 56) / CROP_FRAME_SIZE}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
