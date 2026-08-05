"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import { createCategory, createMenuItem, createNotice, createRequestGuide } from "@/services/admin-service";
import type { AppData } from "@/services/app-service";

type MenuFormState = {
  categoryId: string;
  badge: string;
  name: string;
  description: string;
  price: string;
};

type CategoryFormState = {
  id: string;
  label: string;
};

type NoticeFormState = {
  text: string;
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
};

const defaultNoticeForm: NoticeFormState = {
  text: "",
};

function defaultMenuForm(categoryId: string): MenuFormState {
  return {
    categoryId,
    badge: "",
    name: "",
    description: "",
    price: "",
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

export function AdminScreen({ initialData }: AdminScreenProps) {
  const [appData, setAppData] = useState<AppData>(initialData);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [menuForm, setMenuForm] = useState<MenuFormState>(defaultMenuForm(initialData.categories[0]?.id ?? ""));
  const [requestForm, setRequestForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [activeSection, setActiveSection] = useState<(typeof adminSections)[number]["id"]>("category");
  const [sliderHeight, setSliderHeight] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryOptions = useMemo(() => appData.categories, [appData.categories]);

  function applyNextData(nextData: AppData) {
    setAppData(nextData);
    setMenuForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextData.categories[0]?.id || "",
    }));
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
  }, [activeSection, appData]);

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
        const nextData = await createCategory({ id: normalizedId, label: normalizedLabel });
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
        const nextData = await createMenuItem({
          categoryId: menuForm.categoryId,
          badge: menuForm.badge.trim(),
          name: menuForm.name.trim(),
          description: menuForm.description.trim(),
          price: menuForm.price.trim(),
        });
        applyNextData(nextData);
        setMenuForm(defaultMenuForm(menuForm.categoryId));
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
        const nextData = await createRequestGuide({ text: requestForm.text.trim() });
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
        const nextData = await createNotice({ text: noticeForm.text.trim() });
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
        {statusMessage ? <p className="admin-status admin-status-floating">{statusMessage}</p> : null}

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
            <div className="admin-chip-list">
              {categoryOptions.map((category) => (
                <span key={category.id} className="admin-chip">{category.label}</span>
              ))}
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
                <h2>메뉴 등록</h2>
              </div>
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
              <button className="admin-button" type="submit" disabled={isPending}>메뉴 추가</button>
            </form>
            <div className="admin-preview-list">
              {appData.items.slice(0, 8).map((item) => (
                <div key={item.id} className="admin-preview-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span>{item.price}</span>
                </div>
              ))}
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
                <textarea value={requestForm.text} onChange={(event) => setRequestForm({ text: event.target.value })} placeholder="예: 알레르기 유발 재료가 있으면 주문 전 꼭 말씀해주세요." />
              </label>
              <button className="admin-button" type="submit" disabled={isPending}>요청사항 추가</button>
            </form>
            <div className="admin-text-list">
              {appData.requestGuides.map((guide) => (
                <p key={guide.id} className="admin-text-item">{guide.text}</p>
              ))}
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
                <textarea value={noticeForm.text} onChange={(event) => setNoticeForm({ text: event.target.value })} placeholder="예: 매주 수요일 하이볼 1,000원 할인" />
              </label>
              <button className="admin-button" type="submit" disabled={isPending}>공지 추가</button>
            </form>
            <div className="admin-text-list">
              {appData.notices.map((notice) => (
                <p key={notice.id} className="admin-text-item">{notice.text}</p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
