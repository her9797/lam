import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "관리자 로그인 | LAM 관리자",
};

export default function LoginPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>
            매장 운영자 전용 관리자 웹입니다. 비밀번호를 입력해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
