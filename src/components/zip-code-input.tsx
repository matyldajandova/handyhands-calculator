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
  onValidationChange?: (isValid: boolean) => void;
  pragueOnly?: boolean; // If true, only show success for Prague postal codes (10000-19999)
}

export function ZipCodeInput({ 
  value, 
  onChange, 
  onBlur, 
  name, 
  placeholder = "12345",
  className = "",
  error,
  onValidationChange,
  pragueOnly = false
}: ZipCodeInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [foundRegion, setFoundRegion] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Check if postal code is Prague (10000-19999)
  const isPraguePostalCode = value.length === 5 && /^\d{5}$/.test(value) && value.startsWith("1");

  // Debounced region lookup
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value && value.length === 5 && /^\d{5}$/.test(value)) {
        setIsLoading(true);
        setIsValid(null);
        setFoundRegion(null);
        
        // For Prague-only services, don't show success for non-Prague codes
        if (pragueOnly && !isPraguePostalCode) {
          setIsLoading(false);
          setIsValid(false);
          setFoundRegion(null);
          onValidationChange?.(false);
          return;
        }
        
        try {
          const regionKey = await getRegionFromZipCode(value);
          if (regionKey) {
            const regions = getAvailableRegions();
            const region = regions.find(r => r.value === regionKey);
            if (region) {
              // For Prague-only services, only show success if it's Prague
              if (pragueOnly && !isPraguePostalCode) {
                setFoundRegion(null);
                setIsValid(false);
                onValidationChange?.(false);
              } else {
                setFoundRegion(region.label);
                setIsValid(true);
                onValidationChange?.(true);
              }
            } else {
              setIsValid(false);
              onValidationChange?.(false);
            }
          } else {
            setIsValid(false);
            onValidationChange?.(false);
          }
        } catch (error) {
          console.error('Error looking up zip code:', error);
          setIsValid(false);
          onValidationChange?.(false);
        } finally {
          setIsLoading(false);
        }
      } else if (value.length > 0) {
        setIsValid(false);
        setFoundRegion(null);
        onValidationChange?.(false);
      } else {
        setIsValid(null);
        setFoundRegion(null);
        onValidationChange?.(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [value, onValidationChange, pragueOnly, isPraguePostalCode]);

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
          className={`${className} ${error ? "border-destructive" : ""}`}
          maxLength={5}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Region indicator - only show for non-Prague-only services or when it's Prague */}
      {isLoading && !pragueOnly && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Hledám region...</span>
        </div>
      )}
      
      {/* Only show region success if not Prague-only OR if it's Prague */}
      {!isLoading && foundRegion && (!pragueOnly || isPraguePostalCode) && (
        <div className="flex items-center gap-2 text-sm text-green-success bg-green-success/10 border border-green-success/20 rounded-md px-3 py-2">
          <MapPin className="h-3 w-3" />
          <span><strong>{foundRegion}</strong></span>
        </div>
      )}
      
      {/* Only show "region not found" error for non-Prague-only services (when no validation error exists) */}
      {!isLoading && isValid === false && value.length === 5 && !pragueOnly && !error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          <MapPin className="h-3 w-3" />
          <span>Pro zadané PSČ nebyl nalezen žádný region</span>
        </div>
      )}
      
      {/* Don't show error message here - it's shown by the form validation with warning triangle */}
    </div>
  );
}
