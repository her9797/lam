"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "로그인에 실패했습니다.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="page-shell admin-shell">
      <div className="phone-frame admin-frame">
        <section className="content-card admin-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">admin</p>
              <h2>관리자 로그인</h2>
            </div>
          </div>
          <form className="admin-form single-column" onSubmit={handleSubmit}>
            <label className="admin-field admin-field-wide">
              <span>관리자 비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호 입력" />
            </label>
            {message ? <p className="admin-status">{message}</p> : null}
            <button className="admin-button" type="submit" disabled={isPending}>
              로그인
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
