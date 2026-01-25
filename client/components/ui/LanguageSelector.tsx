import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, type LanguageCode, changeLanguage, getCurrentLanguage } from "@/i18n";

interface LanguageSelectorProps {
  variant?: "default" | "compact";
  className?: string;
}

export function LanguageSelector({ variant = "default", className = "" }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLang = getCurrentLanguage();
  const currentLangInfo = LANGUAGES[currentLang];

  const handleLanguageChange = async (lang: LanguageCode) => {
    await changeLanguage(lang);
    setIsOpen(false);
  };

  // Compact variant - just shows "DE" or "EN" with dropdown
  if (variant === "compact") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 gap-1 text-gray-600 hover:text-gray-900 font-semibold ${className}`}
          >
            <span className="text-sm uppercase">{currentLang}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code as LanguageCode)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-sm font-semibold uppercase w-6">{code}</span>
              <span className="flex-1 text-gray-600">{lang.name}</span>
              {code === currentLang && (
                <Check className="w-4 h-4 text-teal-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant - shows full language name
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 px-3 gap-2 border-gray-200 ${className}`}
        >
          <span className="text-sm font-bold uppercase">{currentLang}</span>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">{currentLangInfo.name}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {Object.entries(LANGUAGES).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as LanguageCode)}
            className="flex items-center gap-3 cursor-pointer py-2"
          >
            <span className="text-sm font-bold uppercase w-6">{code}</span>
            <span className="flex-1">{lang.name}</span>
            {code === currentLang && (
              <Check className="w-4 h-4 text-teal-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
