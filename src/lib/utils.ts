import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function extractClassGroup(
  tailwindClasses: string,
  classGroup: string
): { remainingClasses: string; extractedClasses: string } {
  const classArray = tailwindClasses.split(" ");
  const extractedClasses: string[] = [];
  const remainingClasses: string[] = [];

  classArray.forEach((className) => {
    const parts = className.split(":");
    const comparisonString = `${classGroup}-`;
    if (parts.some((part) => part.startsWith(comparisonString))) {
      extractedClasses.push(className);
    } else {
      remainingClasses.push(className);
    }
  });

  return {
    remainingClasses: remainingClasses.join(" "),
    extractedClasses: extractedClasses.join(" "),
  };
}

export function cn(...inputs: ClassValue[]) {
  const allClasses = clsx(inputs);
  const { remainingClasses, extractedClasses: textClasses } = extractClassGroup(allClasses, "text");
  const mergedClasses = `${twMerge(remainingClasses)} ${textClasses}`.trim();
  return mergedClasses;
}
