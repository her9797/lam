"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  const categoryOptions = useMemo(() => appData.categories, [appData.categories]);

  function applyNextData(nextData: AppData) {
    setAppData(nextData);
    setMenuForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextData.categories[0]?.id || "",
    }));
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
        <header className="hero-card admin-hero">
          <p className="eyebrow">LAM ADMIN</p>
          <h1>운영 관리</h1>
          <p className="hero-copy">{appData.store.name} 메뉴와 안내 문구를 실제 API와 DB 기준으로 관리하는 화면입니다.</p>
          <div className="admin-hero-stats">
            <div className="admin-stat-chip">
              <span>카테고리</span>
              <strong>{appData.categories.length}</strong>
            </div>
            <div className="admin-stat-chip">
              <span>메뉴</span>
              <strong>{appData.items.length}</strong>
            </div>
            <div className="admin-stat-chip">
              <span>안내</span>
              <strong>{appData.requestGuides.length + appData.notices.length}</strong>
            </div>
          </div>
          {statusMessage ? <p className="admin-status">{statusMessage}</p> : null}
        </header>

        <section className="content-card admin-card">
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

        <section className="content-card admin-card">
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

        <section className="content-card admin-card">
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

        <section className="content-card admin-card">
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
    </main>
  );
}
