import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200">
      <div className="p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur border border-zinc-200/50 dark:border-zinc-800/80 shadow-glass rounded-2xl">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
