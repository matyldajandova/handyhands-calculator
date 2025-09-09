"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { getRegionFromZipCode, getAvailableRegions } from "@/utils/zip-code-mapping";

interface ZipCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name: string;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function ZipCodeInput({ 
  value, 
  onChange, 
  onBlur, 
  name, 
  placeholder = "12345",
  className = "",
  error 
}: ZipCodeInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [foundRegion, setFoundRegion] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Debounced region lookup
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value && value.length === 5 && /^\d{5}$/.test(value)) {
        setIsLoading(true);
        setIsValid(null);
        setFoundRegion(null);
        
        try {
          const regionKey = await getRegionFromZipCode(value);
          if (regionKey) {
            const regions = getAvailableRegions();
            const region = regions.find(r => r.value === regionKey);
            if (region) {
              setFoundRegion(region.label);
              setIsValid(true);
            } else {
              setIsValid(false);
            }
          } else {
            setIsValid(false);
          }
        } catch (error) {
          console.error('Error looking up zip code:', error);
          setIsValid(false);
        } finally {
          setIsLoading(false);
        }
      } else if (value.length > 0) {
        setIsValid(false);
        setFoundRegion(null);
      } else {
        setIsValid(null);
        setFoundRegion(null);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${className} ${error ? "border-destructive" : ""} ${
            isValid === true ? "border-green-500" : isValid === false ? "border-destructive" : ""
          }`}
          maxLength={5}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && isValid === true && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <MapPin className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      
      {/* Region indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Hledám region...</span>
        </div>
      )}
      
      {!isLoading && foundRegion && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <MapPin className="h-3 w-3" />
          <span><strong>{foundRegion}</strong></span>
        </div>
      )}
      
      {!isLoading && isValid === false && value.length === 5 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <MapPin className="h-3 w-3" />
          <span>PSČ nenalezeno, použije se výchozí region (Praha)</span>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
