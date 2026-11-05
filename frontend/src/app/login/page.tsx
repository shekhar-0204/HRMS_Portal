"use client";
import React,{useState} from "react";
import {useRouter} from "next/navigation";
import {useHRMS} from "@/context/hrms-context";
import {ApiError} from "@/lib/api/client";
import {Lock,Mail,Eye,EyeOff,Shield,Sun,Moon} from "lucide-react";
import {toast} from "sonner";
import {cn} from "@/lib/utils";

export default function LoginPage(){
 const router=useRouter(); const {login,theme,setTheme}=useHRMS();
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false);
 const isDark=theme==="dark";
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!email.trim()||!password){toast.error("Please enter your email and password");return;}try{setLoading(true);const user=await login(email.trim(),password);toast.success(`Welcome back, ${user.name}`);router.replace(user.mustChangePassword?"/change-password":"/dashboard");}catch(err){const msg=err instanceof ApiError&&err.status===429?"Too many login attempts. Please wait and try again.":err instanceof Error?err.message:"Unable to sign in";toast.error("Login failed",{description:msg});}finally{setLoading(false);}};
 return <main className={cn("min-h-screen flex items-center justify-center p-6",isDark?"bg-slate-950 text-white":"bg-slate-50 text-slate-900")}>
   <div className={cn("absolute top-5 right-5") }><button onClick={()=>setTheme(isDark?"light":"dark")} className="p-2 rounded-lg border">{isDark?<Sun size={18}/>:<Moon size={18}/>}</button></div>
   <div className={cn("w-full max-w-md rounded-2xl border shadow-xl p-8",isDark?"bg-slate-900 border-slate-800":"bg-white border-slate-200")}>
    <div className="flex justify-center mb-5"><img src="/graapes-logo.png" alt="Graapes" className="w-14 h-14 object-contain rounded-xl"/></div>
    <h1 className="text-2xl font-bold text-center">Welcome back</h1><p className="text-sm text-slate-500 text-center mt-2">Sign in to Graapes HRMS</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">Email Address<div className="relative mt-1"><Mail size={17} className="absolute left-3 top-3 text-slate-400"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-transparent" placeholder="name@company.com" required/></div></label>
      <label className="block text-sm font-medium">Password<div className="relative mt-1"><Lock size={17} className="absolute left-3 top-3 text-slate-400"/><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 rounded-lg border bg-transparent" placeholder="Enter your password" required/><button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-2.5 text-slate-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      <button disabled={loading} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60">{loading?"Signing in...":"Sign In"}</button>
    </form>
    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><Shield size={14}/> Secure access • Permissions are managed by your account</div>
   </div>
 </main>;
}
