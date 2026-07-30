import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
