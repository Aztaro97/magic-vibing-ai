"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, LogOut, Settings, User } from "lucide-react";

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
  const handleAuthSuccess = () => {
    setIsSigninOpen(false);
    setIsSignupOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const switchToSignup = () => {
    setIsSigninOpen(false);
    setIsSignupOpen(true);
  };

  const switchToSignin = () => {
    setIsSignupOpen(false);
    setIsSigninOpen(true);
  };

  return (
    <header className="border-border/40 bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center">
            <Image src="/logo.svg" alt="VibeCoding" width={22} height={22} />
          </div>
          <span className="text-base font-semibold tracking-tight">
            VibeCoding
          </span>
        </Link>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-sm"
            >
              <Link href="/dashboard">
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Projects
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="ring-offset-background hover:ring-ring h-8 w-8 cursor-pointer ring-1 ring-transparent transition-all hover:ring-offset-2">
                  <AvatarImage
                    src={session.user.image ?? "/avatars/01.png"}
                    alt={session.user.name || "User"}
                  />
                  <AvatarFallback className="bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {session.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {session.user.name ?? "User"}
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Projects</span>
                  </Link>
                </DropdownMenuItem>
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
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Dialog open={isSigninOpen} onOpenChange={setIsSigninOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-sm"
                >
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
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-medium text-white shadow-sm hover:from-amber-600 hover:to-orange-700"
                >
                  Get Started
                </Button>
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
    </header>
  );
};

export default Navbar;
