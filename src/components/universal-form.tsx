/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn, ControllerRenderProps } from "react-hook-form";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FormConfig, FormField as FormFieldType, FormSubmissionData, ConditionalField, RadioField, SelectField, InputField, TextareaField, CheckboxField, AlertField } from "@/types/form-types";
import * as Icons from "lucide-react";
import React from "react";
import { ZipCodeInput } from "@/components/zip-code-input";

interface UniversalFormProps {
  config: FormConfig;
  onBack?: () => void;
  onSubmit: (data: FormSubmissionData) => void;
  onFormChange?: () => void;
  shouldResetForm?: boolean;
}

// Helper function to get icon component
function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    Calendar: <Icons.Calendar className="h-5 w-5 text-accent" />,
    Building: <Icons.Building className="h-5 w-5 text-accent" />,
    Building2: <Icons.Building2 className="h-5 w-5 text-accent" />,
    Warehouse: <Icons.Warehouse className="h-5 w-5 text-accent" />,
    Home: <Icons.Home className="h-5 w-5 text-accent" />,
    Store: <Icons.Store className="h-5 w-5 text-accent" />,
    Wrench: <Icons.Wrench className="h-5 w-5 text-accent" />,
    ArrowUpDown: <Icons.ArrowUpDown className="h-5 w-5 text-accent" />,
    Droplets: <Icons.Droplets className="h-5 w-5 text-accent" />,
    Sparkles: <Icons.Sparkles className="h-5 w-5 text-accent" />,
    Snowflake: <Icons.Snowflake className="h-5 w-5 text-accent" />,
    MapPin: <Icons.MapPin className="h-5 w-5 text-accent" />,
    Info: <Icons.Info className="h-5 w-5 text-accent" />,
    BrushCleaning: <Icons.BrushCleaning className="h-5 w-5 text-accent" />,
    Bubbles: <Icons.Bubbles className="h-5 w-5 text-accent" />
  };
  
  return iconMap[iconName] || <Icons.Building className="h-5 w-5 text-accent" />;
}

// Custom animated error message component
function AnimatedErrorMessage({ error }: { error: string | undefined }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-2 text-sm text-destructive font-semibold mt-1"
        >
          <Icons.AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Mobile-friendly tooltip wrapper - exported for reuse
export function MobileTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild onClick={() => setOpen(!open)}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Custom field label component with info icon and tooltip
function FieldLabel({ field, isRequired, isInConditionalContext }: { field: FormFieldType; isRequired?: boolean; isInConditionalContext?: boolean }) {
  // AlertField doesn't have label or required properties
  if (field.type === 'alert') {
    return null;
  }
  
  // Show "(volitelné)" whenever the field is not required in the current context.
  // Remove it only when validation makes the field required while visible.
  let shouldShowOptional = isRequired !== undefined
    ? !isRequired
    : !('required' in field ? field.required : false);

  // Universal rule: If field is conditional (visible due to another choice), suppress "(volitelné)"
  // This covers all cases where validation makes a field required when visible
  if (('condition' in field && field.condition) || isInConditionalContext) {
    shouldShowOptional = false;
  }
  
  return (
    <div className="flex items-start gap-2">
      <FormLabel>
        {'label' in field ? field.label : ''}
        {shouldShowOptional && <span className="text-muted-foreground">(volitelné)</span>}
      </FormLabel>
      {'note' in field && field.note && (
        <MobileTooltip content={field.note}>
          <button type="button" className="mt-0.5">
            <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors" />
          </button>
        </MobileTooltip>
      )}
    </div>
  );
}

// Shared component for handling hidden options with show more button
function OptionsWithShowMore({ 
  field, 
  renderOption
}: { 
  field: RadioField | CheckboxField; 
  renderOption: (option: any, isHidden?: boolean) => React.ReactNode;
}) {
  const [showHiddenOptions, setShowHiddenOptions] = useState(false);
  const hasHiddenOptions = field.options.some(option => option.hidden);
  
  const visibleOptions = field.options.filter(option => !option.hidden);
  const hiddenOptions = field.options.filter(option => option.hidden);

  return (
    <div className="space-y-2">
      {/* Render visible options */}
      {visibleOptions.map((option) => renderOption(option))}
      
      {/* Toggle button for hidden options */}
      {hasHiddenOptions && !showHiddenOptions && (
        <div className="flex justify-start pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowHiddenOptions(true)}
            className="text-sm text-muted-foreground hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
          >
            <Icons.ChevronDown className="h-4 w-4" />
            Další možnosti
          </Button>
        </div>
      )}
      
      {/* Render hidden options when shown */}
      <AnimatePresence>
        {showHiddenOptions && hiddenOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col gap-2"
          >
                    {hiddenOptions.map((option) => renderOption(option))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Radio field component with hidden options support
function RadioFieldWithHiddenOptions({ 
  field, 
  formField
}: { 
  field: RadioField; 
  formField: ControllerRenderProps<FormSubmissionData>; 
}) {
  const renderOption = (option: any) => (
    <FormItem key={option.value} className="flex items-start gap-2">
      <FormControl>
        <RadioGroupItem value={option.value.toString()} id={`${field.id}_${option.value}`} className="mt-0.5" />
      </FormControl>
      <FormLabel htmlFor={`${field.id}_${option.value}`} className="font-normal cursor-pointer flex-1 max-w-2xl">
        <div className="flex items-center gap-2">
          <span>{option.label}</span>
          {option.note && (
            <Badge 
              variant="default"
              className="text-xs bg-orange-100 text-orange-800 border-orange-200"
            >
              {option.note === 'frequent' ? 'Nejvyužívanější' : 'Doporučeno'}
            </Badge>
          )}
          {option.tooltip && (
            <MobileTooltip content={option.tooltip}>
              <button type="button" onClick={(e) => e.preventDefault()}>
                <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors" />
              </button>
            </MobileTooltip>
          )}
        </div>
      </FormLabel>
    </FormItem>
  );

  return (
    <RadioGroup
      value={formField.value?.toString() || ""}
      onValueChange={(value) => {
        // Convert back to the original type if it was numeric
        const selectedOption = field.options?.find(opt => opt.value.toString() === value);
        if (selectedOption && typeof selectedOption.value === "number") {
          formField.onChange(selectedOption.value);
        } else {
          formField.onChange(value);
        }
      }}
      className="flex flex-col gap-3"
    >
      <OptionsWithShowMore field={field} renderOption={renderOption} />
    </RadioGroup>
  );
}

// Helper function to evaluate field conditions
function evaluateCondition(condition: any, formData: FormSubmissionData): boolean {
  if (!condition) return true;
  
  // Simple condition
  if (condition.field) {
    const fieldValue = formData[condition.field];
    const operator = condition.operator || 'equals';
    
    switch (operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(condition.value);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(condition.value);
      default:
        return fieldValue === condition.value;
    }
  }
  
  // Complex condition with AND/OR
  if (condition.operator && condition.conditions) {
    const results = condition.conditions.map((subCondition: any) => {
      return evaluateCondition(subCondition, formData);
    });
    
    const finalResult = condition.operator === 'and' 
      ? results.every((result: boolean) => result)
      : results.some((result: boolean) => result);
    
    return finalResult;
  }
  
  return true;
}

// Helper function to render conditional fields
function renderConditionalFields(field: FormFieldType, form: UseFormReturn<FormSubmissionData>, onZipCodeValidationChange?: (fieldId: string, isValid: boolean) => void) {
  if (field.type !== "conditional") return null;
  
  const conditionalField = field as ConditionalField;
  const shouldShow = evaluateCondition(conditionalField.condition, form.getValues());

  return (
    <AnimatePresence mode="wait" initial={false}>
      {shouldShow && (
        <motion.div
          key="conditional-fields"
          initial={{ opacity: 0, height: 0, overflow: "hidden" }}
          animate={{ opacity: 1, height: "auto", overflow: "visible" }}
          exit={{ 
            opacity: 0, 
            height: 0, 
            overflow: "hidden"
          }}
          transition={{ 
            duration: 0.3, 
            ease: "easeInOut"
          }}
          className="flex flex-col pl-6 border-l-2 border-border/50 space-y-6"
        >
          {conditionalField.fields.map((subField: FormFieldType, index: number) => {
            // Check if sub-field should be shown based on its condition
            const shouldShowSubField = evaluateCondition(subField.condition, form.getValues());
            
            if (!shouldShowSubField) return null;
            
            return (
              <motion.div
                key={subField.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
              >
                <FormField
                  control={form.control}
                  name={subField.id as keyof FormSubmissionData}
                  render={({ field: subFormField }) => (
                    <FormItem className={subField.label || subField.description ? "" : ""}>
                      {subField.label && (
                        <FieldLabel field={subField} isRequired={shouldShowSubField && subField.required} isInConditionalContext={true} />
                      )}
                      <FormControl>
                        {renderField(subField, subFormField, form.formState, form, onZipCodeValidationChange)}
                      </FormControl>
                      {subField.description && (
                        <p className="text-xs text-muted-foreground">
                          {subField.description}
                        </p>
                      )}
                      <AnimatedErrorMessage error={
                        form.formState.errors[subField.id]?.message as string | undefined
                      } />
                    </FormItem>
                  )}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to render individual fields
function renderField(field: FormFieldType, formField: ControllerRenderProps<FormSubmissionData>, formState: any, form: any, onZipCodeValidationChange?: (fieldId: string, isValid: boolean) => void) {
  const placeholder = 'placeholder' in field ? field.placeholder : undefined;

  switch (field.type) {
    case "radio":
      const radioField = field as RadioField;
      return <RadioFieldWithHiddenOptions field={radioField} formField={formField} />;

    case "select":
      const selectField = field as SelectField;
      return (
        <Select value={formField.value?.toString() || ""} onValueChange={formField.onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder || "Vyberte možnost"} />
          </SelectTrigger>
          <SelectContent>
            {selectField.options.map((option: { value: string; label: string; note?: string }) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {option.note && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors ml-2" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-sm">{option.note}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "input":
      const inputField = field as InputField;
      
      // Use custom ZipCodeInput for zip code fields
      if (field.id === "zipCode") {
        return (
          <ZipCodeInput
            value={formField.value?.toString() || ""}
            onChange={formField.onChange}
            onBlur={formField.onBlur}
            name={formField.name}
            placeholder={placeholder}
            className={formField.name && formState.errors[formField.name] ? "border-destructive" : ""}
            error={formState.errors[formField.name]?.message as string}
            onValidationChange={(isValid) => {
              onZipCodeValidationChange?.(field.id, isValid);
            }}
          />
        );
      }
      
      return (
        <Input
          type={inputField.inputType}
          min={inputField.min}
          max={inputField.max}
          step={inputField.step}
          placeholder={placeholder}
          className={formField.name && formState.errors[formField.name] ? "border-destructive" : ""}
          value={formField.value?.toString() || ""}
          onChange={(e) => {
            const value = e.target.value;
            if (inputField.inputType === 'number') {
              // For number inputs, always keep as string in form state, convert to number only when needed
              formField.onChange(value);
            } else {
              formField.onChange(value);
            }
          }}
          onBlur={(e) => {
            if (inputField.inputType === 'number') {
              const value = e.target.value;
              const numValue = parseFloat(value);
              if (value !== '' && !isNaN(numValue)) {
                if (inputField.min !== undefined && numValue < inputField.min) {
                  // Value is below minimum - show error immediately
                  e.target.setCustomValidity(`Hodnota musí být alespoň ${inputField.min}`);
                  e.target.reportValidity();
                } else if (inputField.max !== undefined && numValue > inputField.max) {
                  // Value is above maximum - show error immediately
                  e.target.setCustomValidity(`Hodnota nesmí být větší než ${inputField.max}`);
                  e.target.reportValidity();
                } else {
                  // Value is valid - clear any existing errors
                  e.target.setCustomValidity('');
                }
              } else if (value === '') {
                // Empty value - clear errors
                e.target.setCustomValidity('');
              }
            }
          }}
        />
      );

    case "textarea":
      const textareaField = field as TextareaField;
      return (
        <Textarea
          placeholder={placeholder}
          rows={textareaField.rows || 4}
          className={formField.name && formState.errors[formField.name] ? "border-destructive" : ""}
          {...formField}
          value={formField.value?.toString() || ""}
        />
      );

    case "checkbox":
      const checkboxField = field as CheckboxField;
      const currentValues = Array.isArray(formField.value) ? formField.value : [];
      
      // Special logic for window type field to handle mutual exclusion
      const isWindowTypeField = field.id === "windowType";
      const hasNewSelected = currentValues.includes("new");
      const hasOriginalSelected = currentValues.includes("original");
      
      // Special logic for cleaning days field to handle frequency-based selection limits
      const isCleaningDaysField = field.id === "cleaningDays";
      const hasNoPreferenceSelected = currentValues.includes("no-preference");
      
      // Special logic for cleaning supplies field to handle exclusive selection
      const isCleaningSuppliesField = field.id === "cleaningSupplies";
      const hasOwnSuppliesSelected = currentValues.includes("own-supplies");
      const hasOtherSuppliesSelected = currentValues.some(val => val !== "own-supplies");
      
      // Get cleaning frequency from form values
      const formValues = form.watch();
      const cleaningFrequency = formValues.cleaningFrequency;
      
      // Get expected number of days based on frequency
      const getExpectedDaysCount = (frequency: string) => {
        const expectedDays = {
          "3x-weekly": 3,
          "2x-weekly": 2,
          "twice-weekly": 2, // Home cleaning form uses this value
          "weekly": 1,
          "biweekly": 1
        };
        return expectedDays[frequency as keyof typeof expectedDays] || 0;
      };
      
      const expectedDaysCount = getExpectedDaysCount(cleaningFrequency);
      
      // Create dynamic label for cleaning days
      const getCleaningDaysLabel = () => {
        if (expectedDaysCount > 0) {
          return `Vyberte ${expectedDaysCount} ${expectedDaysCount === 1 ? 'preferovaný den' : expectedDaysCount < 5 ? 'preferované dny' : 'dní'} v týdnu pro úklid`;
        }
        return "Vyberte preferované dny v týdnu pro úklid";
      };
      
      const renderOption = (option: any) => {
        let isDisabled = false;
        let disabledReason = "";
        
        if (isWindowTypeField) {
          // Disable "original" if "new" is selected
          if (option.value === "original" && hasNewSelected) {
            isDisabled = true;
            disabledReason = "Nelze vybrat současně s novými okny";
          }
          // Disable "new" if "original" is selected
          if (option.value === "new" && hasOriginalSelected) {
            isDisabled = true;
            disabledReason = "Nelze vybrat současně s původními okny";
          }
        }
        
        if (isCleaningDaysField) {
          // If "no preference" is selected, disable all day options
          if (hasNoPreferenceSelected && option.value !== "no-preference") {
            isDisabled = true;
            disabledReason = "";
          }
          // If we have reached the maximum number of days, disable remaining day options (but not selected ones)
          else if (option.value !== "no-preference" && !hasNoPreferenceSelected && 
                   !currentValues.includes(option.value) &&
                   currentValues.filter(val => val !== "no-preference").length >= expectedDaysCount) {
            isDisabled = true;
            disabledReason = "";
          }
          // Disable "no preference" if any days are selected
          else if (option.value === "no-preference" && currentValues.some(val => val !== "no-preference")) {
            isDisabled = true;
            disabledReason = "";
          }
        }
        
        if (isCleaningSuppliesField) {
          // If "own-supplies" is selected, disable all other options
          if (hasOwnSuppliesSelected && option.value !== "own-supplies") {
            isDisabled = true;
            disabledReason = "";
          }
          // If other options are selected, disable "own-supplies"
          else if (option.value === "own-supplies" && hasOtherSuppliesSelected) {
            isDisabled = true;
            disabledReason = "";
          }
        }
        
        return (
          <FormItem key={option.value} className="flex items-start gap-2">
            <FormControl>
              <Checkbox
                id={`${field.id}_${option.value}`}
                checked={currentValues.includes(option.value)}
                disabled={isDisabled}
                className="mt-0.5"
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  if (checked) {
                    formField.onChange([...currentValues, option.value]);
                  } else {
                    formField.onChange(currentValues.filter((value: string) => value !== option.value));
                  }
                }}
              />
            </FormControl>
            <FormLabel 
              htmlFor={`${field.id}_${option.value}`} 
              className={`font-normal cursor-pointer flex-1 max-w-2xl ${isDisabled ? 'text-muted-foreground' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span>{option.label}</span>
                {option.note && (
                  <Badge 
                    variant="default"
                    className="text-xs bg-orange-100 text-orange-800 border-orange-200"
                  >
                    {option.note === 'frequent' ? 'Nejvyužívanější' : 'Doporučeno'}
                  </Badge>
                )}
                {isDisabled && disabledReason && (
                  <span className="text-xs text-muted-foreground">({disabledReason})</span>
                )}
                {option.tooltip && (
                  <MobileTooltip content={option.tooltip}>
                    <button type="button" onClick={(e) => e.preventDefault()}>
                      <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors" />
                    </button>
                  </MobileTooltip>
                )}
              </div>
            </FormLabel>
          </FormItem>
        );
      };

      return (
        <div className="flex flex-col gap-3">
          {isCleaningDaysField && (
            <div className="text-sm font-medium text-foreground mb-1">
              {getCleaningDaysLabel()}
            </div>
          )}
          <OptionsWithShowMore field={checkboxField} renderOption={renderOption} />
        </div>
      );

    case "alert":
      const alertField = field as AlertField;
      
      return (
        <Alert variant={alertField.variant || "default"}>
          <Icons.Info className="h-4 w-4" />
          {alertField.title && <AlertTitle>{alertField.title}</AlertTitle>}
          {alertField.description && <AlertDescription>{alertField.description}</AlertDescription>}
        </Alert>
      );

    default:
      return null;
  }
}

export function UniversalForm({ config, onBack, onSubmit, onFormChange, shouldResetForm }: UniversalFormProps) {
  // Create default values for all fields
  const createDefaultValues = (): FormSubmissionData => {
    const defaults: FormSubmissionData = {};
    config.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === "radio") {
          const firstOption = (field as RadioField).options?.[0];
          if (firstOption && typeof firstOption.value === "number") {
            defaults[field.id] = undefined; // Don't set a default for numeric radio fields
          } else {
            defaults[field.id] = "";
          }
        } else if (field.type === "select") {
          const selectField = field as SelectField;
          const defaultOption = selectField.options?.find(option => option.default);
          defaults[field.id] = defaultOption?.value || "";
        } else if (field.type === "input") {
          const inputField = field as InputField;
          if (inputField.inputType === 'number') {
            defaults[field.id] = "";
          } else {
            defaults[field.id] = "";
          }
        } else if (field.type === "textarea") {
          defaults[field.id] = "";
        } else if (field.type === "checkbox") {
          defaults[field.id] = [];
        } else if (field.type === "conditional") {
          const conditionalField = field as ConditionalField;
          conditionalField.fields.forEach((subField: FormFieldType) => {
            if (subField.type === "radio") {
              const firstOption = (subField as RadioField).options?.[0];
              if (firstOption && typeof firstOption.value === "number") {
                defaults[subField.id] = "";
              } else {
                defaults[subField.id] = "";
              }
            } else if (subField.type === "select") {
              const subSelectField = subField as SelectField;
              const defaultOption = subSelectField.options?.find(option => option.default);
              defaults[subField.id] = defaultOption?.value || "";
            } else if (subField.type === "input") {
              const subInputField = subField as InputField;
              if (subInputField.inputType === 'number') {
                defaults[subField.id] = "";
              } else {
                defaults[subField.id] = "";
              }
            } else if (subField.type === "textarea") {
              defaults[subField.id] = "";
            } else if (subField.type === "checkbox") {
              defaults[subField.id] = [];
            }
          });
        }
      });
    });
    return defaults;
  };

  const form = useForm<FormSubmissionData>({
    // This any type is necessary due to Zod v3 + react-hook-form compatibility issues
    resolver: zodResolver(config.validationSchema as any),
    defaultValues: createDefaultValues(),
    // Removed mode: "onChange"
  });

  // Track zip code validation state
  const [zipCodeValidation, setZipCodeValidation] = useState<Record<string, boolean>>({});

  // Callback for zip code validation changes
  const handleZipCodeValidationChange = (fieldId: string, isValid: boolean) => {
    setZipCodeValidation(prev => ({
      ...prev,
      [fieldId]: isValid
    }));
  };

  // Track form changes for warning dialog and conditional field updates
  useEffect(() => {
    if (onFormChange) {
      const subscription = form.watch((value, { name, type }) => {
        // Only call onFormChange if it's an actual field change, not form initialization
        if (type === 'change' && name) {
          onFormChange();
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onFormChange]);

  // Force re-render when form values change to update conditional fields
  const formValues = form.watch();


  // Scroll to first error when errors appear
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      const firstErrorField = Object.keys(form.formState.errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        setTimeout(() => {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [form.formState.errors]);

  // Reset form when shouldResetForm changes to true
  useEffect(() => {
    if (shouldResetForm) {
      form.reset();
    }
  }, [shouldResetForm, form]);


  const handleSubmit = (values: FormSubmissionData) => {
    // Check if any zip code fields failed validation
    const hasInvalidZipCode = Object.values(zipCodeValidation).some(isValid => isValid === false);
    if (hasInvalidZipCode) {
      // Prevent submission if zip code validation failed
      return;
    }

    if (onSubmit) {
      onSubmit(values);
    } else {
    }
  };

  const handleBack = () => {
    if (onBack) {
      // Don't reset form here - let the parent component handle it
      // when the user actually confirms they want to leave
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Back Button at Top */}
      {onBack && (
        <div className="mb-8 items-center flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
          >
            <Icons.ArrowLeft className="h-5 w-5" />
            Zpět na výběr služby
          </Button>
        </div>
      )}

      <div className="mb-12">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-foreground font-heading mb-4">
          {config.title}
        </h1>
        <p className="text-muted-foreground text-xl leading-7 font-sans max-w-2xl">
          {config.description}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {config.sections.map((section) => {
            const shouldShowSection = section.condition ? evaluateCondition(section.condition, form.getValues()) : true;
            
            return (
            <AnimatePresence key={section.id} mode="wait" initial={false}>
              {shouldShowSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Card id={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 scroll-m-20 text-2xl font-semibold tracking-tight text-foreground font-heading">
                  {getIconComponent(section.icon)}
                  {section.title}
                </CardTitle>
                {section.description && (
                  <p className="text-muted-foreground font-sans">
                    {section.description}
                  </p>
                )}
                {section.note && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {section.note}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                  {section.fields.map((field: FormFieldType, index: number) => {
                    // Check if field should be shown based on its condition
                    const shouldShowField = 'condition' in field && field.condition ? evaluateCondition(field.condition, form.getValues()) : true;
                  
                  // Determine if field should be required when visible
                  const isRequiredWhenVisible = shouldShowField && 'required' in field && field.required;
                  
                  return (
                  <React.Fragment key={field.id}>
                      <AnimatePresence mode="wait" initial={false}>
                        {shouldShowField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                    {field.type === "alert" ? (
                      <div className="">
                        {renderField(field, {} as ControllerRenderProps<FormSubmissionData>, form.formState, form, handleZipCodeValidationChange)}
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name={field.id as keyof FormSubmissionData}
                        render={({ field: formField }) => (
                          <FormItem className="">
                            {field.type !== "conditional" && 'label' in field && field.label && field.id !== "cleaningDays" && (
                              <FieldLabel field={field} isRequired={isRequiredWhenVisible} isInConditionalContext={false} />
                            )}
                            <FormControl>
                              {renderField(field, formField, form.formState, form, handleZipCodeValidationChange)}
                            </FormControl>
                            {field.description && (
                              <p className="text-xs text-muted-foreground">
                                {field.description}
                              </p>
                            )}
                            <AnimatedErrorMessage error={
                              form.formState.errors[field.id]?.message as string | undefined
                            } />
                            
                            {/* Render conditional fields if this is a conditional field */}
                            {field.type === "conditional" && renderConditionalFields(field, form, handleZipCodeValidationChange)}
                          </FormItem>
                        )}
                      />
                    )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    
                    {/* Add separator between fields (but not after the last one, after conditional fields, or before conditional fields) */}
                    {shouldShowField && index < section.fields.length - 1 && 
                     field.type !== "conditional" && 
                     section.fields[index + 1]?.type !== "conditional" && 
                     !(field.type === "radio" && section.fields[index + 1]?.type === "conditional" && 
                         (section.fields[index + 1] as ConditionalField)?.condition && 
                         'field' in (section.fields[index + 1] as ConditionalField).condition && 
                         ((section.fields[index + 1] as ConditionalField).condition as any).field === field.id) && 
                     // Don't show separator if next field has empty label
                     section.fields[index + 1]?.label !== "" &&
                     // Check if the next field is also visible
                     ('condition' in section.fields[index + 1] && section.fields[index + 1].condition ? 
                       evaluateCondition(section.fields[index + 1].condition, formValues) : true) && (
                      <Separator className="my-6" />
                    )}
                  </React.Fragment>
                  );
                })}
                </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            );
          })}

          {/* Calculate Button - Centered and Larger */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
            >
              Vypočítat cenu
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
