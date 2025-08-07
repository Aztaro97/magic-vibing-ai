"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

import { signOut, useSession } from "@acme/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui";

import { SigninForm } from "../forms/signin-form";
import { SignupForm } from "../forms/signup-form";

const Navbar = () => {
  const { data: session } = useSession();
  const [isSigninOpen, setIsSigninOpen] = React.useState(false);
  const [isSignupOpen, setIsSignupOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const handleAuthSuccess = () => {
    setIsSigninOpen(false);
    setIsSignupOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const switchToSignup = () => {
    setAuthMode("signup");
    setIsSigninOpen(false);
    setIsSignupOpen(true);
  };

  const switchToSignin = () => {
    setAuthMode("signin");
    setIsSignupOpen(false);
    setIsSigninOpen(true);
  };

  return (
    <div className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 z-50 border-b p-4 backdrop-blur transition-all duration-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Magic App" width={24} height={24} />
          <span className="text-lg font-semibold">Magic App</span>
        </Link>

        {session?.user ? (
          // Authenticated user - show avatar dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="ring-offset-background hover:ring-ring cursor-pointer transition-colors hover:ring-2 hover:ring-offset-2">
                <AvatarImage
                  src={session.user.image || "/avatars/01.png"}
                  alt={session.user.name || "User"}
                />
                <AvatarFallback>
                  {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm leading-none font-medium">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-muted-foreground text-xs leading-none">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Unauthenticated user - show sign in/up buttons
          <div className="flex items-center gap-3">
            <Dialog open={isSigninOpen} onOpenChange={setIsSigninOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <SigninForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignup={switchToSignup}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Sign Up</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <SignupForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignin={switchToSignin}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
