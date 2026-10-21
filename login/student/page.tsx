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
import { getStudentByRegisterNumber } from "@/lib/virtual-storage";

export default function StudentLoginPage() {
  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const student = getStudentByRegisterNumber(registerNumber);

      if (student) {
        if (password === registerNumber) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: student.id,
              name: student.name,
              registerNumber: student.registerNumber,
              email: student.email,
              role: "student",
            })
          );

          toast({
            title: "Login successful",
            description: `Welcome, ${student.name}!`,
          });

          router.push("/student/dashboard");
        } else {
          toast({
            title: "Login failed",
            description:
              "Invalid password. For demo, use your register number as password.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login failed",
          description: "Student not found. Please check your register number.",
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
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <CardDescription>
            Enter your register number and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registerNumber">Register Number</Label>
              <Input
                id="registerNumber"
                placeholder="e.g. 71812205107"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
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
              <p className="text-xs text-slate-500">
                For demo purposes, use your register number as your password.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-slate-600">
            <p>Demo Register Number: 71812205107</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
