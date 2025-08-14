"use client";

import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { FormConfig, FormField as FormFieldType } from "@/types/form-types";
import * as Icons from "lucide-react";
import React from "react";

interface UniversalFormProps {
  config: FormConfig;
  onBack?: () => void;
  onSubmit?: (data: any) => void;
}

// Helper function to get icon component
function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    Calendar: <Icons.Calendar className="h-5 w-5 text-accent" />,
    Building: <Icons.Building className="h-5 w-5 text-accent" />,
    Building2: <Icons.Building2 className="h-5 w-5 text-accent" />,
    Warehouse: <Icons.Warehouse className="h-5 w-5 text-accent" />,
    Home: <Icons.Home className="h-5 w-5 text-accent" />,
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

// Helper function to render conditional fields
function renderConditionalFields(field: FormFieldType, form: any) {
  if (field.type !== "conditional") return null;
  
  const conditionalField = field as any;
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
                name={subField.id as any}
                render={({ field: subFormField }) => (
                  <FormItem className="space-y-2">
                    {subField.type !== "radio" && subField.label && (
                      <FormLabel>
                        {subField.label}
                        {!subField.required && <span className="text-muted-foreground ml-2">(volitelné)</span>}
                      </FormLabel>
                    )}
                    {subField.type === "radio" && subField.label && (
                      <FormLabel>
                        {subField.label}
                        {!subField.required && <span className="text-muted-foreground ml-2">(volitelné)</span>}
                      </FormLabel>
                    )}
                    <FormControl>
                      {renderField(subField, subFormField)}
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

// Helper function to render field based on type
function renderField(
  field: FormFieldType,
  formField: any
) {
  const { id, type, label, required, placeholder, description, validation } = field;

  switch (type) {
    case "radio":
      const radioField = field as any;
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
          className={radioField.layout === "vertical" ? "flex flex-col gap-3" : "flex gap-6"}
        >
          {radioField.options.map((option: any) => (
            <FormItem key={option.value} className="flex items-center gap-2">
              <FormControl>
                <RadioGroupItem value={option.value.toString()} id={`${id}_${option.value}`} />
              </FormControl>
              <FormLabel htmlFor={`${id}_${option.value}`} className="font-normal cursor-pointer">
                <span className="font-medium">{option.label}</span>
                {option.note && (
                  <Badge className="ml-2">{option.note}</Badge>
                )}
              </FormLabel>
            </FormItem>
          ))}
        </RadioGroup>
      );

    case "select":
      const selectField = field as any;
      return (
        <Select value={formField.value} onValueChange={formField.onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder || "Vyberte možnost"} />
          </SelectTrigger>
          <SelectContent>
            {selectField.options.map((option: any) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "input":
      const inputField = field as any;
      return (
        <Input
          type={inputField.inputType}
          min={inputField.min}
          max={inputField.max}
          step={inputField.step}
          placeholder={placeholder}
          {...formField}
        />
      );

    case "textarea":
      const textareaField = field as any;
      return (
        <Textarea
          placeholder={placeholder}
          rows={textareaField.rows || 4}
          {...formField}
        />
      );

    default:
      return null;
  }
}

export function UniversalForm({ config, onBack, onSubmit }: UniversalFormProps) {
  // Create default values for all fields
  const createDefaultValues = () => {
    const defaults: any = {};
    config.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === "radio") {
          // Check if the first option is numeric
          const firstOption = (field as any).options?.[0];
          if (firstOption && typeof firstOption.value === "number") {
            defaults[field.id] = undefined; // Don't set a default for numeric radio fields
          } else {
            defaults[field.id] = ""; // Default to empty string for text fields
          }
        } else if (field.type === "select") {
          defaults[field.id] = "";
        } else if (field.type === "input") {
          defaults[field.id] = "";
        } else if (field.type === "textarea") {
          defaults[field.id] = "";
        } else if (field.type === "conditional") {
          // For conditional fields, we need to check if they should be required
          const conditionalField = field as any;
          const conditionField = conditionalField.condition.field;
          const conditionValue = conditionalField.condition.value;
          
          // Set defaults for conditional sub-fields
          conditionalField.fields.forEach((subField: any) => {
            if (subField.type === "radio") {
              const firstOption = subField.options?.[0];
              if (firstOption && typeof firstOption.value === "number") {
                defaults[subField.id] = undefined;
              } else {
                defaults[subField.id] = "";
              }
            } else if (subField.type === "select") {
              defaults[subField.id] = "";
            } else if (subField.type === "input") {
              defaults[subField.id] = "";
            } else if (subField.type === "textarea") {
              defaults[subField.id] = "";
            }
          });
        }
      });
    });
    return defaults;
  };

  const form = useForm({
    resolver: zodResolver(config.validationSchema),
    defaultValues: createDefaultValues(),
  });

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

  const handleSubmit = (values: any) => {
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
      <div className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance text-foreground font-heading mb-6">
          {config.title}
        </h1>
        <p className="text-muted-foreground text-xl leading-7 font-sans max-w-2xl mx-auto">
          {config.description}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                {section.fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    <FormField
                      control={form.control}
                      name={field.id as any}
                      render={({ field: formField }) => (
                        <FormItem className="space-y-2">
                          {field.type !== "conditional" && field.type !== "radio" && field.label && (
                            <FormLabel>
                              {field.label}
                              {!field.required && <span className="text-muted-foreground ml-2">(volitelné)</span>}
                            </FormLabel>
                          )}
                          {field.type === "radio" && field.label && (
                            <FormLabel>
                              {field.label}
                              {!field.required && <span className="text-muted-foreground ml-2">(volitelné)</span>}
                            </FormLabel>
                          )}
                          <FormControl>
                            {renderField(field, formField)}
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
                       (section.fields[index + 1] as any)?.condition?.field === field.id) && (
                      <Separator className="my-6 bg-muted/40" />
                    )}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            {onBack && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors"
              >
                ← Zpět na výběr služby
              </button>
            )}

            <Button
              type="submit"
              size="lg"
              className="px-8 py-3 text-lg font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Vypočítat cenu
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
