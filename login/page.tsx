"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, ArrowLeft, User, BookOpen, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getStudentByRegisterNumber } from "@/lib/virtual-storage"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("student")
  const router = useRouter()
  const { toast } = useToast()

  // Student login state
  const [studentRegisterNumber, setStudentRegisterNumber] = useState("")
  const [studentPassword, setStudentPassword] = useState("")
  const [studentLoading, setStudentLoading] = useState(false)

  // Faculty login state
  const [facultyEmail, setFacultyEmail] = useState("")
  const [facultyPassword, setFacultyPassword] = useState("")
  const [facultyLoading, setFacultyLoading] = useState(false)

  // Admin login state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStudentLoading(true)

    try {
      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if student exists
      const student = getStudentByRegisterNumber(studentRegisterNumber)

      if (student) {
        // In a real app, we would verify the password here
        // For demo purposes, we'll just check if the password is the same as the register number
        if (studentPassword === studentRegisterNumber) {
          // Store student data in localStorage
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: student.id,
              name: student.name,
              registerNumber: student.registerNumber,
              email: student.email,
              role: "student",
            }),
          )

          toast({
            title: "Login successful",
            description: `Welcome, ${student.name}!`,
          })

          // Redirect to student dashboard
          router.push("/student/dashboard")
        } else {
          toast({
            title: "Login failed",
            description: "Invalid password. For demo, use your register number as password.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Login failed",
          description: "Student not found. Please check your register number.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      })
    } finally {
      setStudentLoading(false)
    }
  }

  const handleFacultyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFacultyLoading(true)

    try {
      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Demo credentials
      const demoUsers = [{ email: "faculty@institution.edu", password: "faculty123", role: "faculty" }]

      // Check credentials against demo users
      const user = demoUsers.find((user) => user.email === facultyEmail && user.password === facultyPassword)

      if (user) {
        // Store user data in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: user.email,
            role: user.role,
            name: "Faculty User",
          }),
        )

        toast({
          title: "Login successful",
          description: "Welcome back, Faculty!",
        })

        // Redirect to dashboard
        router.push("/dashboard")
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password. Try the demo credentials.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFacultyLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)

    try {
      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Demo credentials
      const demoUsers = [{ email: "admin@institution.edu", password: "admin123", role: "admin" }]

      // Check credentials against demo users
      const user = demoUsers.find((user) => user.email === adminEmail && user.password === adminPassword)

      if (user) {
        // Store user data in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: user.email,
            role: user.role,
            name: "Admin User",
          }),
        )

        toast({
          title: "Login successful",
          description: "Welcome back, Admin!",
        })

        // Redirect to dashboard
        router.push("/dashboard")
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password. Try the demo credentials.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-sm text-white/80 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription className="text-indigo-100">
            Sign in to your account to access the attendance system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="student" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="student"
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600"
              >
                <User className="mr-2 h-4 w-4" />
                Student
              </TabsTrigger>
              <TabsTrigger
                value="faculty"
                className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Faculty
              </TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="p-6">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerNumber">Register Number</Label>
                  <Input
                    id="registerNumber"
                    placeholder="e.g. 71812205107"
                    value={studentRegisterNumber}
                    onChange={(e) => setStudentRegisterNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentPassword">Password</Label>
                  <Input
                    id="studentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    For demo purposes, use your register number as your password.
                  </p>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={studentLoading}>
                  {studentLoading ? "Logging in..." : "Login as Student"}
                </Button>
                <div className="text-center text-sm text-slate-600">
                  <p>Demo Register Number: 71812205107</p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="faculty" className="p-6">
              <form onSubmit={handleFacultyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="facultyEmail">Email</Label>
                  <Input
                    id="facultyEmail"
                    type="email"
                    placeholder="faculty@institution.edu"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facultyPassword">Password</Label>
                  <Input
                    id="facultyPassword"
                    type="password"
                    placeholder="••••••••"
                    value={facultyPassword}
                    onChange={(e) => setFacultyPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={facultyLoading}>
                  {facultyLoading ? "Logging in..." : "Login as Faculty"}
                </Button>
                <div className="text-center text-sm text-slate-600">
                  <p>Demo Credentials:</p>
                  <p>Email: faculty@institution.edu</p>
                  <p>Password: faculty123</p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="p-6">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@institution.edu"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={adminLoading}>
                  {adminLoading ? "Logging in..." : "Login as Admin"}
                </Button>
                <div className="text-center text-sm text-slate-600">
                  <p>Demo Credentials:</p>
                  <p>Email: admin@institution.edu</p>
                  <p>Password: admin123</p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-slate-50 p-6">
          <div className="text-center text-sm text-slate-600">
            <p>Don't have an account? Contact your administrator.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
