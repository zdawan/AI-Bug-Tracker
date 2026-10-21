"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FacultyLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Demo credentials
  const demoUsers = [
    {
      email: "faculty@institution.edu",
      password: "faculty123",
      role: "faculty",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check credentials against demo users
      const user = demoUsers.find(
        (user) => user.email === email && user.password === password
      );

      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: user.email,
            role: user.role,
            name: "Faculty User",
          })
        );

        toast({
          title: "Login successful",
          description: "Welcome back, Faculty!",
        });

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password. Try the demo credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-slate-800" />
            </div>
          </div>
          <CardTitle className="text-2xl">Faculty Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="faculty@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-slate-600">
            <p>Demo Credentials:</p>
            <p>Email: faculty@institution.edu</p>
            <p>Password: faculty123</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
