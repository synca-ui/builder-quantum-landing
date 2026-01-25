import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
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

  if (variant === "compact") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 gap-1 text-gray-600 hover:text-gray-900 ${className}`}
          >
            <span className="text-base">{currentLangInfo.flag}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code as LanguageCode)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base">{lang.flag}</span>
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

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 px-3 gap-2 border-gray-200 ${className}`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-base">{currentLangInfo.flag}</span>
          <span className="text-sm font-medium">{currentLangInfo.name}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {Object.entries(LANGUAGES).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as LanguageCode)}
            className="flex items-center gap-3 cursor-pointer py-2"
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="flex-1 font-medium">{lang.name}</span>
            {code === currentLang && (
              <Check className="w-4 h-4 text-teal-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
