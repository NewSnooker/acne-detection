"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FcGoogle } from "react-icons/fc";
import { loginSchema } from "@/schemas/auth";
import { loginWithGoogle, loginWithCredentials } from "@/app/actions/auth-actions"; 
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

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>("");
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
          {error && (
            <div className="p-3 text-sm font-medium rounded-lg bg-destructive/15 text-destructive border border-destructive/20 text-center">
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
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            หรือเข้าสู่ระบบด้วย
          </span>
        </div>
      </div>

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

      <div className="text-center text-sm pt-2">
        <span className="text-muted-foreground">ยังไม่มีบัญชี? </span>
        <Link
          href="/register"
          className="text-primary hover:underline font-medium"
        >
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}
