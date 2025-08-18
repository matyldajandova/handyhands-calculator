/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn, ControllerRenderProps } from "react-hook-form";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FormConfig, FormField as FormFieldType, FormSubmissionData, ConditionalField, RadioField, SelectField, InputField, TextareaField } from "@/types/form-types";
import * as Icons from "lucide-react";
import React from "react";

interface UniversalFormProps {
  config: FormConfig;
  onBack?: () => void;
  onSubmit: (data: FormSubmissionData) => void;
  onFormChange?: () => void;
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
    Info: <Icons.Info className="h-5 w-5 text-accent" />
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

// Custom field label component with info icon and tooltip
function FieldLabel({ field }: { field: FormFieldType }) {
  return (
    <div className="flex items-center gap-2">
      <FormLabel>
        {field.label}
        {!field.required && <span className="text-muted-foreground ml-2">(volitelné)</span>}
      </FormLabel>
      {field.note && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{field.note}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Helper function to render conditional fields
function renderConditionalFields(field: FormFieldType, form: UseFormReturn<FormSubmissionData>) {
  if (field.type !== "conditional") return null;
  
  const conditionalField = field as ConditionalField;
  const conditionField = conditionalField.condition.field;
  const conditionValue = conditionalField.condition.value;
  const shouldShow = form.watch(conditionField) === conditionValue;

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
          className="mt-6 space-y-6 pl-6 border-l-2 border-accent/20"
        >
          {conditionalField.fields.map((subField: FormFieldType, index: number) => (
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
                  <FormItem className="space-y-2">
                    {subField.label && (
                      <FieldLabel field={subField} />
                    )}
                    <FormControl>
                      {renderField(subField, subFormField, form.formState)}
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
              
              {/* Add separator between conditional sub-fields (but not after the last one) */}
              {index < conditionalField.fields.length - 1 && (
                <Separator className="my-4 bg-muted/40" />
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to render individual fields
function renderField(field: FormFieldType, formField: ControllerRenderProps<FormSubmissionData>, formState: any) {
  const { placeholder } = field;

  switch (field.type) {
    case "radio":
      const radioField = field as RadioField;
      return (
        <RadioGroup
          value={formField.value?.toString() || ""}
          onValueChange={(value) => {
            // Convert back to the original type if it was numeric
            const firstOption = radioField.options?.[0];
            if (firstOption && typeof firstOption.value === "number") {
              formField.onChange(parseInt(value, 10));
            } else {
              formField.onChange(value);
            }
          }}
          className="flex flex-col gap-3"
        >
          {radioField.options.map((option: { value: string | number; label: string; note?: 'frequent' | 'recommended'; tooltip?: string }) => (
            <FormItem key={option.value} className="flex items-center gap-2">
              <FormControl>
                <RadioGroupItem value={option.value.toString()} id={`${field.id}_${option.value}`} />
              </FormControl>
              <FormLabel htmlFor={`${field.id}_${option.value}`} className="font-normal cursor-pointer">
                <span>{option.label}</span>
                <div className="flex items-center gap-2">
                  {option.note && (
                    <Badge 
                      variant={option.note === 'frequent' ? 'secondary' : 'default'}
                      className={`text-xs ${
                        option.note === 'frequent' 
                          ? 'bg-muted text-muted-foreground' 
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      {option.note === 'frequent' ? 'nejběžnější' : 'doporučeno'}
                    </Badge>
                  )}
                  {option.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icons.Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-accent transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">{option.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </FormLabel>
            </FormItem>
          ))}
        </RadioGroup>
      );

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
        />
      );

    default:
      return null;
  }
}

export function UniversalForm({ config, onBack, onSubmit, onFormChange }: UniversalFormProps) {
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
          defaults[field.id] = "";
        } else if (field.type === "input") {
          const inputField = field as InputField;
          if (inputField.inputType === 'number') {
            defaults[field.id] = "";
          } else {
            defaults[field.id] = "";
          }
        } else if (field.type === "textarea") {
          defaults[field.id] = "";
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
              defaults[subField.id] = "";
            } else if (subField.type === "input") {
              const subInputField = subField as InputField;
              if (subInputField.inputType === 'number') {
                defaults[subField.id] = "";
              } else {
                defaults[subField.id] = "";
              }
            } else if (subField.type === "textarea") {
              defaults[subField.id] = "";
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

  // Track form changes for warning dialog
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

  const handleSubmit = (values: FormSubmissionData) => {
    if (onSubmit) {
      onSubmit(values);
    } else {
      console.log("Form submitted:", values);
    }
  };

  const handleBack = () => {
    if (onBack) {
      form.reset();
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

      <div className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance text-foreground font-heading mb-6">
          {config.title}
        </h1>
        <p className="text-muted-foreground text-xl leading-7 font-sans max-w-2xl mx-auto">
          {config.description}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {config.sections.map((section) => (
            <Card key={section.id} id={section.id}>
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
              </CardHeader>
              <CardContent>
                {section.fields.map((field: FormFieldType, index: number) => (
                  <React.Fragment key={field.id}>
                    <FormField
                      control={form.control}
                      name={field.id as keyof FormSubmissionData}
                      render={({ field: formField }) => (
                        <FormItem className="space-y-2">
                                              {field.type !== "conditional" && field.label && (
                      <FieldLabel field={field} />
                    )}
                          <FormControl>
                            {renderField(field, formField, form.formState)}
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
                          {field.type === "conditional" && renderConditionalFields(field, form)}
                        </FormItem>
                      )}
                    />
                    
                    {/* Add separator between fields (but not after the last one, after conditional fields, or before conditional fields) */}
                    {index < section.fields.length - 1 && 
                     field.type !== "conditional" && 
                     section.fields[index + 1]?.type !== "conditional" && 
                     !(field.type === "radio" && section.fields[index + 1]?.type === "conditional" && 
                       (section.fields[index + 1] as ConditionalField)?.condition?.field === field.id) && (
                      <Separator className="my-6 bg-muted/40" />
                    )}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          ))}

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
