"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import type { MenuCategory, MenuItem, NoticeItem } from "@/data/menu-data";
import {
  createCategory,
  createMenuItem,
  createNotice,
  deleteCategory as deleteCategoryApi,
  deleteMenuItem,
  deleteNotice as deleteNoticeApi,
  uploadMenuImage,
} from "@/services/admin-service";
import {
  deleteSpecialRequest,
  listCustomerRequests,
  type CustomerRequest,
  type SpecialRequest,
  type CustomerRequestStatus,
  listSpecialRequests,
  updateCustomerRequestStatus,
} from "@/services/customer-request-service";
import type { AppData } from "@/services/app-service";

type MenuFormState = {
  categoryId: string;
  badge: string;
  badgeColor: string;
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
  badgeColor: string;
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

type CustomSelectOption = {
  value: string;
  label: string;
  textColor?: string;
};

const adminSections = [
  { id: "category", label: "카테고리", kicker: "category", title: "카테고리 만들기" },
  { id: "menu", label: "메뉴", kicker: "menu", title: "메뉴 등록" },
  { id: "request", label: "손님 요청", kicker: "request", title: "손님 요청 확인" },
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

const customerRequestStatusLabel: Record<CustomerRequestStatus, string> = {
  pending: "미처리",
  checked: "확인",
  completed: "처리완료",
};

const badgeColorOptions = [
  { value: "green", label: "그린", textColor: "#6ee7a2" },
  { value: "amber", label: "앰버", textColor: "#fcd34d" },
  { value: "pink", label: "핑크", textColor: "#f9a8d4" },
  { value: "blue", label: "블루", textColor: "#93c5fd" },
] as const;

const menuPanels = [
  { id: "manage", label: "관리" },
  { id: "create", label: "등록" },
] as const;

function defaultMenuForm(categoryId: string): MenuFormState {
  return {
    categoryId,
    badge: "",
    badgeColor: "green",
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
    badgeColor: item.badgeColor ?? "green",
    name: item.name,
    description: item.description,
    price: item.price,
  };
}

function getPrimaryMenuImage(item: MenuItem) {
  return item.images?.find((image) => image.isPrimary) ?? item.images?.[0];
}

function CustomSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className={disabled ? "admin-custom-select is-disabled" : "admin-custom-select"}>
      <button
        type="button"
        className={isOpen ? "admin-custom-select-trigger active" : "admin-custom-select-trigger"}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span style={selectedOption?.textColor ? { color: selectedOption.textColor } : undefined}>
          {selectedOption?.label ?? ""}
        </span>
        <span className="admin-custom-select-arrow">▾</span>
      </button>
      {isOpen ? (
        <div className="admin-custom-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value ? "admin-custom-select-option active" : "admin-custom-select-option"}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={option.textColor ? { color: option.textColor } : undefined}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);
  const [specialRequests, setSpecialRequests] = useState<SpecialRequest[]>([]);
  const [isLoadingCustomerRequests, setIsLoadingCustomerRequests] = useState<boolean>(true);
  const [selectedSpecialRequest, setSelectedSpecialRequest] = useState<SpecialRequest | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [requests, special] = await Promise.all([
          listCustomerRequests(),
          listSpecialRequests(),
        ]);
        if (isMounted) {
          setCustomerRequests(requests);
          setSpecialRequests(special);
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error instanceof Error ? error.message : "손님 요청을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomerRequests(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);
  const [activeSection, setActiveSection] = useState<(typeof adminSections)[number]["id"]>("category");
  const [sliderHeight, setSliderHeight] = useState<number>(0);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<EditableCategoryState>(defaultCategoryForm);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingMenu, setEditingMenu] = useState<EditableMenuState>(defaultMenuForm(initialData.categories[0]?.id ?? ""));
  const [editingMenuCropDraft, setEditingMenuCropDraft] = useState<CropDraftState | null>(null);
  const [isEditingMenuCropModalOpen, setIsEditingMenuCropModalOpen] = useState<boolean>(false);
  const [menuManageCategoryId, setMenuManageCategoryId] = useState<string>(initialData.categories[0]?.id ?? "");
  const [activeMenuPanel, setActiveMenuPanel] = useState<(typeof menuPanels)[number]["id"]>("manage");
  const [newMenuCropDraft, setNewMenuCropDraft] = useState<CropDraftState | null>(null);
  const [isNewMenuCropModalOpen, setIsNewMenuCropModalOpen] = useState<boolean>(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingNoticeText, setEditingNoticeText] = useState<string>("");
  const [activeRequestBoardIndex, setActiveRequestBoardIndex] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const requestBoardStripRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryOptions = useMemo(() => appData.categories, [appData.categories]);
  const managedMenuItems = useMemo(
    () => appData.items.filter((item) => item.categoryId === menuManageCategoryId),
    [appData.items, menuManageCategoryId],
  );
  const specialMaleCustomerRequests = useMemo(
    () => specialRequests.filter((item) => item.gender === "male"),
    [specialRequests],
  );
  const specialFemaleCustomerRequests = useMemo(
    () => specialRequests.filter((item) => item.gender === "female"),
    [specialRequests],
  );

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
      return nextData.categories.some((category) => category.id === current)
        ? current
        : nextData.categories[0]?.id ?? "";
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

  function handleRequestBoardScroll() {
    const strip = requestBoardStripRef.current;
    if (!strip) {
      return;
    }

    const boards = Array.from(strip.children) as HTMLElement[];
    if (boards.length === 0) {
      return;
    }

    let nearestIndex = activeRequestBoardIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    boards.forEach((board, index) => {
      const distance = Math.abs(strip.scrollLeft - board.offsetLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== activeRequestBoardIndex) {
      setActiveRequestBoardIndex(nearestIndex);
    }
  }

  useEffect(() => {
    handleRequestBoardScroll();
  }, [customerRequests.length, specialMaleCustomerRequests.length, specialFemaleCustomerRequests.length]);

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
    setIsEditingMenuCropModalOpen(false);
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
    const nextBadgeColor = nextBadge ? editingMenu.badgeColor : undefined;
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
              badgeColor: nextBadgeColor,
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
                    badgeColor: nextBadgeColor,
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
        setIsEditingMenuCropModalOpen(true);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "이미지를 불러오지 못했습니다.");
      }
    })();
    event.target.value = "";
  }

  function beginNoticeEdit(item: NoticeItem) {
    setEditingNoticeId(item.id);
    setEditingNoticeText(item.text);
  }

  function cancelNoticeEdit() {
    setEditingNoticeId(null);
    setEditingNoticeText("");
  }

  function saveNoticeEdit(itemId: string) {
    const nextText = editingNoticeText.trim();
    if (!nextText) {
      setStatusMessage("문구를 입력해주세요.");
      return;
    }

    setAppData((current) => ({
      ...current,
      notices: current.notices.map((item) => (item.id === itemId ? { ...item, text: nextText } : item)),
    }));
    cancelNoticeEdit();
    setStatusMessage("이벤트 수정 UI를 반영했습니다.");
  }

  function deleteNotice(itemId: string) {
    startTransition(async () => {
      try {
        const nextData = await deleteNoticeApi(itemId);

        applyNextData(nextData);
        cancelNoticeEdit();
        setStatusMessage("이벤트/공지를 삭제했습니다.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
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
          badgeColor: menuForm.badge.trim() ? menuForm.badgeColor : "",
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
        setIsNewMenuCropModalOpen(false);
        setStatusMessage("메뉴를 저장했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "메뉴 저장에 실패했습니다.");
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


  function formatCustomerRequestDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function handleCustomerRequestStatusChange(requestId: string, status: CustomerRequestStatus) {
    startTransition(async () => {
      try {
        const nextRequests = await updateCustomerRequestStatus(requestId, status);
        setCustomerRequests(nextRequests);
        setStatusMessage(status === "completed" ? "요청을 처리완료로 표시했습니다." : "요청을 확인 처리했습니다.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "요청 상태 변경에 실패했습니다.");
      }
    });
  }

  function renderCustomerRequests(list: CustomerRequest[], emptyMessage: string) {
    if (isLoadingCustomerRequests) {
      return (
        <article className="admin-manage-card admin-manage-card-stack">
          <p className="admin-manage-text">손님 요청을 불러오는 중입니다.</p>
        </article>
      );
    }

    if (list.length === 0) {
      return (
        <article className="admin-manage-card admin-manage-card-stack">
          <p className="admin-manage-text">{emptyMessage}</p>
        </article>
      );
    }

    return list.map((customerRequest) => (
      <article
        key={customerRequest.id}
        className="admin-manage-card admin-manage-card-stack"
      >
        <div className="admin-manage-copy">
          <>
            <div className="admin-manage-meta admin-request-meta">
              <span>바로 전달하기</span>
              {customerRequest.tableNumber ? <span>테이블 {customerRequest.tableNumber}</span> : null}
              <span>{customerRequestStatusLabel[customerRequest.status]}</span>
              <span>{formatCustomerRequestDate(customerRequest.createdAt)}</span>
              {customerRequest.handledAt ? <span>처리 {formatCustomerRequestDate(customerRequest.handledAt)}</span> : null}
            </div>
            <p className="admin-manage-text">{customerRequest.text}</p>
          </>
        </div>
        <div className="admin-row-actions">
          {customerRequest.status === "pending" ? (
            <button
              type="button"
              className="admin-small-button"
              disabled={isPending}
              onClick={() => handleCustomerRequestStatusChange(customerRequest.id, "checked")}
            >
              확인
            </button>
          ) : null}
          {customerRequest.status === "checked" ? (
            <button
              type="button"
              className="admin-small-button"
              disabled={isPending}
              onClick={() => handleCustomerRequestStatusChange(customerRequest.id, "completed")}
            >
              처리완료
            </button>
          ) : null}
        </div>
      </article>
    ));
  }

  function renderSpecialRequests(list: SpecialRequest[], emptyMessage: string) {
    if (isLoadingCustomerRequests) {
      return (
        <article className="admin-manage-card admin-manage-card-stack">
          <p className="admin-manage-text">손님 요청을 불러오는 중입니다.</p>
        </article>
      );
    }

    if (list.length === 0) {
      return (
        <article className="admin-manage-card admin-manage-card-stack">
          <p className="admin-manage-text">{emptyMessage}</p>
        </article>
      );
    }

    return list.map((specialRequest) => (
      <article
        key={specialRequest.id}
        className="admin-manage-card admin-manage-card-special"
      >
        <div className="admin-manage-copy">
          <div className="admin-special-summary">
            <div className="admin-special-summary-row">
              <span className="admin-special-summary-name">{specialRequest.name}</span>
              <span className="admin-special-summary-age">{specialRequest.age}</span>
            </div>
            {specialRequest.tableNumber ? (
              <div className="admin-manage-meta admin-request-meta">
                <span>테이블 {specialRequest.tableNumber}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="admin-special-actions">
          <button
            type="button"
            className="admin-ghost-button admin-compact-action"
            onClick={() => setSelectedSpecialRequest(specialRequest)}
          >
            상세보기
          </button>
          <button
            type="button"
            className="admin-danger-button admin-compact-action"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  const nextRequests = await deleteSpecialRequest(specialRequest.id);
                  setSpecialRequests(nextRequests);
                  if (selectedSpecialRequest?.id === specialRequest.id) {
                    setSelectedSpecialRequest(null);
                  }
                  setStatusMessage("특별한 요청을 삭제했습니다.");
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "특별한 요청 삭제에 실패했습니다.");
                }
              });
            }}
          >
            삭제
          </button>
        </div>
      </article>
    ));
  }

  function getRequestListClassName(count: number) {
    return count > 5
      ? "admin-manage-list admin-manage-list-scroll"
      : "admin-manage-list";
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
            <div className="admin-subtabs" role="tablist" aria-label="메뉴 작업 구분">
              {menuPanels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  role="tab"
                  aria-selected={activeMenuPanel === panel.id}
                  className={activeMenuPanel === panel.id ? "admin-subtab active" : "admin-subtab"}
                  onClick={() => setActiveMenuPanel(panel.id)}
                >
                  {panel.label}
                </button>
              ))}
            </div>
            {activeMenuPanel === "manage" ? (
              <div className="admin-manage-section">
                <div className="admin-manage-header">
                  <strong>등록된 메뉴 관리</strong>
                  <span>{managedMenuItems.length}개</span>
                </div>
                <div className="admin-filter-row">
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
                <div className="admin-manage-list admin-manage-list-menu-scroll">
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
                                  <CustomSelect
                                    label="수정 메뉴 카테고리"
                                    value={editingMenu.categoryId}
                                    options={categoryOptions.map((category) => ({
                                      value: category.id,
                                      label: category.label,
                                    }))}
                                    onChange={(nextValue) =>
                                      setEditingMenu((current) => ({
                                        ...current,
                                        categoryId: nextValue,
                                      }))
                                    }
                                  />
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
                                  <div className="admin-badge-row">
                                    <label className="admin-field admin-field-inline-badge">
                                      <span className="sr-only">배지</span>
                                      <input
                                        value={editingMenu.badge}
                                        onChange={(event) =>
                                          setEditingMenu((current) => ({
                                            ...current,
                                            badge: event.target.value,
                                            badgeColor: event.target.value.trim() ? current.badgeColor : "green",
                                          }))
                                        }
                                        placeholder="badge"
                                      />
                                    </label>
                                    <label className="admin-field admin-field-inline-badge-color">
                                      <span className="sr-only">배지 색상</span>
                                      <CustomSelect
                                        label="수정 배지 색상"
                                        value={editingMenu.badgeColor}
                                        options={badgeColorOptions}
                                        onChange={(nextValue) =>
                                          setEditingMenu((current) => ({
                                            ...current,
                                            badgeColor: nextValue,
                                          }))
                                        }
                                        disabled={!editingMenu.badge.trim()}
                                      />
                                    </label>
                                  </div>
                                  <label className="admin-field admin-field-inline-title">
                                    <span className="sr-only">메뉴명</span>
                                    <input value={editingMenu.name} onChange={(event) => setEditingMenu((current) => ({ ...current, name: event.target.value }))} />
                                  </label>
                                  <label className="admin-field admin-field-inline-body">
                                    <span className="sr-only">설명</span>
                                    <textarea value={editingMenu.description} onChange={(event) => setEditingMenu((current) => ({ ...current, description: event.target.value }))} />
                                  </label>
                                  {editingMenuCropDraft ? (
                                    <div className="admin-inline-crop-summary">
                                      <span>사진 영역 선택 완료</span>
                                      <button
                                        type="button"
                                        className="admin-ghost-button"
                                        onClick={() => setIsEditingMenuCropModalOpen(true)}
                                      >
                                        영역 설정
                                      </button>
                                    </div>
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
            ) : (
              <div className="admin-manage-section">
                <div className="admin-manage-header">
                  <strong>새 메뉴 등록</strong>
                </div>
                <form className="admin-form admin-create-form single-column" onSubmit={handleMenuSubmit}>
                  <div className="admin-form-panel">
                    <div className="admin-form-panel-header">
                      <strong>기본 정보</strong>
                    </div>
                    <div className="admin-form-panel-grid">
                      <div className="admin-field">
                        <span>카테고리</span>
                        <CustomSelect
                          label="메뉴 카테고리"
                          value={menuForm.categoryId}
                          options={categoryOptions.map((category) => ({
                            value: category.id,
                            label: category.label,
                          }))}
                          onChange={(nextValue) =>
                            setMenuForm((current) => ({
                              ...current,
                              categoryId: nextValue,
                            }))
                          }
                        />
                      </div>
                      <label className="admin-field">
                        <span>가격</span>
                        <input value={menuForm.price} onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))} placeholder="예: 11,000원" />
                      </label>
                      <label className="admin-field admin-field-wide">
                        <span>메뉴명</span>
                        <input value={menuForm.name} onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))} placeholder="예: 하우스 진토닉" />
                      </label>
                      <label className="admin-field admin-field-wide">
                        <span>설명</span>
                        <textarea value={menuForm.description} onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))} placeholder="메뉴 설명을 입력하세요" />
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-panel">
                    <div className="admin-form-panel-header">
                      <strong>배지 설정</strong>
                    </div>
                    <div className="admin-form-panel-grid">
                      <div className="admin-field admin-badge-field">
                        <span>배지</span>
                        <div className="admin-badge-row">
                          <input
                            value={menuForm.badge}
                            onChange={(event) =>
                              setMenuForm((current) => ({
                                ...current,
                                badge: event.target.value,
                                badgeColor: event.target.value.trim() ? current.badgeColor : "green",
                              }))
                            }
                            placeholder="예: signature"
                          />
                        </div>
                        <CustomSelect
                          label="배지 색상"
                          value={menuForm.badgeColor}
                          options={badgeColorOptions}
                          onChange={(nextValue) =>
                            setMenuForm((current) => ({
                              ...current,
                              badgeColor: nextValue,
                            }))
                          }
                          disabled={!menuForm.badge.trim()}
                        />
                        <small className="admin-field-help">배지가 없으면 색상은 적용되지 않습니다.</small>
                      </div>
                    </div>
                  </div>

                  <div className="admin-form-panel">
                    <div className="admin-form-panel-header">
                      <strong>사진</strong>
                    </div>
                    <div className="admin-form-panel-grid">
                      <div className="admin-field admin-field-wide">
                        <span>메뉴 사진</span>
                        <label className="admin-image-editor admin-image-editor-form admin-image-editor-create">
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
                                  setIsNewMenuCropModalOpen(true);
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
                          <div className="admin-inline-crop-summary">
                            <span>사진 영역 선택 완료</span>
                            <button
                              type="button"
                              className="admin-ghost-button"
                              onClick={() => setIsNewMenuCropModalOpen(true)}
                            >
                              영역 설정
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button className="admin-button" type="submit" disabled={isPending}>메뉴 추가</button>
                </form>
              </div>
            )}
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
                <h2>손님 요청 확인</h2>
              </div>
            </div>
            <div className="admin-request-board-pagination" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={
                    activeRequestBoardIndex === index
                      ? "admin-request-board-dot active"
                      : "admin-request-board-dot"
                  }
                />
              ))}
            </div>
            <div
              ref={requestBoardStripRef}
              className="admin-request-board-strip admin-manage-section-first"
              onScroll={handleRequestBoardScroll}
            >
              <div className="admin-request-board">
                <div className="admin-manage-header">
                  <strong>바로 전달하기</strong>
                  <span>{customerRequests.length}개</span>
                </div>
                <div className={getRequestListClassName(customerRequests.length)}>
                  {renderCustomerRequests(customerRequests, "아직 바로 전달하기 요청이 없습니다.")}
                </div>
              </div>
              <div className="admin-request-board">
                <div className="admin-manage-header">
                  <strong>특별한 - 남자</strong>
                  <span>{specialMaleCustomerRequests.length}개</span>
                </div>
                <div className={getRequestListClassName(specialMaleCustomerRequests.length)}>
                  {renderSpecialRequests(specialMaleCustomerRequests, "아직 특별한 남자 요청이 없습니다.")}
                </div>
              </div>
              <div className="admin-request-board">
                <div className="admin-manage-header">
                  <strong>특별한 - 여자</strong>
                  <span>{specialFemaleCustomerRequests.length}개</span>
                </div>
                <div className={getRequestListClassName(specialFemaleCustomerRequests.length)}>
                  {renderSpecialRequests(specialFemaleCustomerRequests, "아직 특별한 여자 요청이 없습니다.")}
                </div>
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
                            <button type="button" className="admin-small-button" onClick={() => saveNoticeEdit(notice.id)}>저장</button>
                            <button type="button" className="admin-ghost-button" onClick={cancelNoticeEdit}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="admin-manage-text">{notice.text}</p>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-ghost-button" onClick={() => beginNoticeEdit(notice)}>수정</button>
                            <button type="button" className="admin-danger-button" onClick={() => deleteNotice(notice.id)}>삭제</button>
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
      {selectedSpecialRequest ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedSpecialRequest(null)}
        >
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="특별한 요청 상세"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <p className="section-kicker">special</p>
                <h2>특별한 요청 상세</h2>
              </div>
              <button
                type="button"
                className="admin-ghost-button"
                onClick={() => setSelectedSpecialRequest(null)}
              >
                닫기
              </button>
            </div>
            <div className="admin-special-ledger">
              <div className="admin-special-card-list">
                <div className="admin-special-row">
                  <strong>테이블</strong>
                  <p>{selectedSpecialRequest.tableNumber}</p>
                </div>
                <div className="admin-special-row">
                  <strong>이름</strong>
                  <p>{selectedSpecialRequest.name}</p>
                </div>
                <div className="admin-special-row">
                  <strong>나이</strong>
                  <p>{selectedSpecialRequest.age}</p>
                </div>
                <div className="admin-special-row">
                  <strong>사는 곳</strong>
                  <p>{selectedSpecialRequest.residence}</p>
                </div>
                <div className="admin-special-row">
                  <strong>연락처</strong>
                  <p>{selectedSpecialRequest.instagram}</p>
                </div>
                <div className="admin-special-row">
                  <strong>이상형</strong>
                  <p>{selectedSpecialRequest.idealType}</p>
                </div>
                <div className="admin-special-row">
                  <strong>하고 싶은 말</strong>
                  <p>{selectedSpecialRequest.text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {editingMenuCropDraft && isEditingMenuCropModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setIsEditingMenuCropModalOpen(false)}
        >
          <div
            className="admin-modal-card admin-crop-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="메뉴 사진 영역 설정"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <p className="section-kicker">crop</p>
                <h2>메뉴 사진 영역 설정</h2>
              </div>
              <button
                type="button"
                className="admin-ghost-button"
                onClick={() => setIsEditingMenuCropModalOpen(false)}
              >
                완료
              </button>
            </div>
            <ImageCropEditor
              imageUrl={editingMenuCropDraft.imageUrl}
              transform={editingMenuCropDraft.transform}
              onTransformChange={(transform) =>
                setEditingMenuCropDraft((current) => (current ? { ...current, transform } : current))
              }
            />
          </div>
        </div>
      ) : null}
      {newMenuCropDraft && isNewMenuCropModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setIsNewMenuCropModalOpen(false)}
        >
          <div
            className="admin-modal-card admin-crop-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="새 메뉴 사진 영역 설정"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <p className="section-kicker">crop</p>
                <h2>새 메뉴 사진 영역 설정</h2>
              </div>
              <button
                type="button"
                className="admin-ghost-button"
                onClick={() => setIsNewMenuCropModalOpen(false)}
              >
                완료
              </button>
            </div>
            <ImageCropEditor
              imageUrl={newMenuCropDraft.imageUrl}
              transform={newMenuCropDraft.transform}
              onTransformChange={(transform) =>
                setNewMenuCropDraft((current) => (current ? { ...current, transform } : current))
              }
            />
          </div>
        </div>
      ) : null}
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
