"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DaimonIcon } from "@/components/icons/daimon-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      {/* Header/Branding */}
      <div className="text-center mb-10 max-w-md">
        <div className="w-16 h-16 bg-daemon-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <DaimonIcon className="w-8 h-8 text-daemon" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground mb-3">
          Daimon
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {flow === "signIn"
            ? "Welcome back. Your creative companion awaits."
            : "Begin your journey with a guiding voice for your writing."}
        </p>
      </div>

      {/* Form */}
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", flow);
              void signIn("password", formData)
                .catch((error) => {
                  setError(error.message);
                  setLoading(false);
                })
                .then(() => {
                  // For new sign-ups, redirect to onboarding flow
                  if (flow === "signUp") {
                    router.push("/?onboarding=true");
                  } else {
                    router.push("/");
                  }
                });
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="focus-visible:ring-daemon"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  minLength={8}
                  required
                  className="focus-visible:ring-daemon"
                />
                {flow === "signUp" && (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-daemon hover:bg-daemon/90 text-daemon-foreground"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span>Please wait...</span>
                </span>
              ) : flow === "signIn" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>

            <div className="flex flex-row gap-1.5 text-sm justify-center mt-2">
              <span className="text-muted-foreground">
                {flow === "signIn"
                  ? "New to Daimon?"
                  : "Already have an account?"}
              </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-daemon hover:text-daemon/80"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              >
                {flow === "signIn" ? "Create account" : "Sign in"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Footer tagline */}
      <p className="text-center text-sm text-muted-foreground mt-10 max-w-xs">
        The AI that never writes for you, only whispers ideas and connections.
      </p>
    </div>
  );
}
