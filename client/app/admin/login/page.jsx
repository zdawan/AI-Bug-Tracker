"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const dev = localStorage.getItem("developer");
    if (dev) {
      router.push("/admin/assigned");
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter email to login", { autoClose: 3000 });
      return;
    }

    try {
      const res = await axios.get(
        `${API}/api/developers/email/${encodeURIComponent(email)}`
      );
      // Save developer in local storage for session
      localStorage.setItem("developer", JSON.stringify(res.data));
      router.push("/admin/assigned");
    } catch (err) {
      toast.error("Invalid email or server error", { autoClose: 3000 });
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center 
      font-sans
      bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)] 
      [background-size:24px_24px] 
      bg-gradient-to-br from-blue-50 to-purple-100 
      px-6 relative overflow-hidden"
    >
      {/* Gradient glow rising from bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 
        w-[160vw] h-[160vw] 
        bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-blue-300/40
        blur-3xl opacity-40"
      ></div>

      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-6 text-gray-900">
          Admin{" "}
          <span
            className="font-extralight italic text-gray-900"
            style={{ fontFamily: "Times New Roman, Times, serif" }}
          >
            Login
          </span>
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Use your organization email to
          <br />
          access the assigned url's.
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 shadow-sm"
          />
          <button
            type="submit"
            className="py-3 rounded-xl bg-black text-white font-semibold text-lg shadow-lg cursor-pointer hover:bg-blue-600 hover:opacity-90 transition"
          >
            Login
          </button>
          <p className="flex items-center justify-center">
            Test mail: jnr1006262@gmail.com
          </p>
        </form>
      </div>

      {/* Toastify */}
      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
