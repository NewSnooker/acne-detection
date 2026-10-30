"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FcGoogle } from "react-icons/fc";
import { loginSchema } from "@/schemas/auth";
import {
  loginWithGoogle,
  loginWithCredentials,
} from "@/app/actions/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ข้อความสำหรับรหัส error ที่ส่งกลับมาทาง /login?error=...
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  GoogleNotConfigured:
    "ระบบนี้ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google (ไม่พบ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน",
  OAuthAccountNotLinked:
    "อีเมลนี้สมัครด้วยรหัสผ่านไว้แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน",
  AccessDenied: "ไม่ได้รับอนุญาตให้เข้าสู่ระบบ",
  Configuration: "การตั้งค่าระบบเข้าสู่ระบบไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
};
const DEFAULT_AUTH_ERROR = "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

interface LoginFormProps {
  /** มี env ของ Google ครบหรือไม่ (ตรวจฝั่ง server) */
  googleEnabled?: boolean;
  /** รหัส error จาก query string เช่น OAuthAccountNotLinked */
  errorCode?: string;
  /** เพิ่งสมัครสมาชิกสำเร็จแล้วถูกพามาหน้านี้ */
  registered?: boolean;
}

export function LoginForm({
  googleEnabled = true,
  errorCode,
  registered = false,
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(
    errorCode ? (AUTH_ERROR_MESSAGES[errorCode] ?? DEFAULT_AUTH_ERROR) : "",
  );
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);

      const result = await loginWithCredentials(formData);

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/analyze");
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form
          method="post"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {registered && !error && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/15 p-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
              สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-destructive/15 text-destructive border-destructive/20 rounded-lg border p-3 text-center text-sm font-medium"
            >
              {error}
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>อีเมล</FormLabel>
                <FormControl>
                  <Input
                    placeholder="admin@example.com"
                    type="email"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>รหัสผ่าน</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card text-muted-foreground px-2">
            หรือเข้าสู่ระบบด้วย
          </span>
        </div>
      </div>

      {googleEnabled ? (
        <form action={loginWithGoogle}>
          <Button
            variant="outline"
            type="submit"
            disabled={isPending}
            className="w-full"
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Google
          </Button>
        </form>
      ) : (
        // ยังไม่ได้ตั้งค่า Google OAuth: กดแล้วแจ้งเตือน ไม่ส่งไปหา Google
        <Button
          variant="outline"
          type="button"
          disabled={isPending}
          className="w-full"
          onClick={() => setError(AUTH_ERROR_MESSAGES.GoogleNotConfigured)}
        >
          <FcGoogle className="mr-2 h-5 w-5" />
          Google
        </Button>
      )}

      <div className="pt-2 text-center text-sm">
        <span className="text-muted-foreground">ยังไม่มีบัญชี? </span>
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}
