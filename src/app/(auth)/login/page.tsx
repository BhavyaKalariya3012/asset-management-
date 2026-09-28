"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardHat, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const DEMO_USERS = [
  { role: "Admin (Chief Engineer)", email: "admin@gov.in", password: "Admin@123" },
  { role: "Manager (EE, Ahmedabad)", email: "manager@gov.in", password: "Manager@123" },
  { role: "Officer (AE, Ahmedabad)", email: "officer@gov.in", password: "Officer@123" },
  { role: "Manager (EE, Surat)", email: "manager2@gov.in", password: "Manager@123" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <HardHat className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold text-slate-900">R&amp;B AssetTrack</h1>
        <p className="text-sm text-slate-500">
          Roads &amp; Buildings Department · Govt. of Gujarat
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-medium text-slate-700">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          Demo credentials
        </div>
        <ul className="space-y-1">
          {DEMO_USERS.map((u) => (
            <li key={u.email}>
              <button
                type="button"
                onClick={() => fillDemo(u.email, u.password)}
                className="w-full rounded-md px-2 py-1 text-left hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">{u.role}</span>
                <span className="block text-xs text-slate-500">
                  {u.email} · {u.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
