/**
 * OrganizerSetup Component
 * 
 * Multi-step onboarding wizard for new organizers to complete their profile.
 * This is a critical first-time user experience that collects essential information
 * needed for organizers to start creating events and booking artists.
 * 
 * Features:
 * - 3-step progressive disclosure form
 * - Step-by-step validation (validates only current step fields)
 * - Skip functionality with sessionStorage persistence
 * - Real-time validation feedback
 * - Animated step transitions
 * - Progress indicator
 * 
 * Data Flow:
 * 1. User fills form across 3 steps
 * 2. On submit, data is sent to POST /api/organizer/profile/complete
 * 3. Server sets metadata.profileComplete = true and trustScore = 50
 * 4. User is redirected to dashboard with full platform access
 * 
 * Related Files:
 * - Validation: shared/routes.ts (organizerOnboardingSchema)
 * - API Hook: client/src/hooks/use-organizer.ts (useCompleteOnboarding)
 * - Server Route: server/routes/organizer.ts (POST /organizer/profile/complete)
 * - Requirements: .kiro/specs/organizer-role/requirements.md (Requirement 1)
 * 
 * @see {@link https://github.com/bandwidth/docs/ORGANIZER_ONBOARDING.md} for detailed documentation
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { organizerOnboardingSchema } from "@shared/routes";
import { useCompleteOnboarding } from "@/hooks/use-organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

/**
 * Type definition for the onboarding form data.
 * Inferred from the Zod schema to ensure type safety between client and server.
 */
type OnboardingFormData = z.infer<typeof organizerOnboardingSchema>;

export default function OrganizerSetup() {
  // Wouter hook for programmatic navigation (redirects after completion)
  const [, setLocation] = useLocation();
  
  // Track which step (1-3) the user is currently viewing
  const [currentStep, setCurrentStep] = useState(1);
  
  // TanStack Query mutation hook for submitting onboarding data to the server
  // Handles loading state, error handling, and cache invalidation
  const completeMutation = useCompleteOnboarding();

  /**
   * React Hook Form setup with Zod validation resolver.
   * 
   * The zodResolver integrates Zod schema validation with React Hook Form,
   * providing type-safe validation that matches the server-side schema.
   * 
   * Default values initialize all fields to prevent uncontrolled component warnings.
   * Empty strings for text fields, empty object for nested contactPerson, empty array for references.
   */
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(organizerOnboardingSchema),
    defaultValues: {
      organizationName: "",
      description: "",
      contactPerson: {
        name: "",
        email: "",
        phone: "",
      },
      website: "",
      pastEventReferences: [],
    },
  });

  // Total number of steps in the wizard (used for progress calculation)
  const totalSteps = 3;
  
  // Calculate progress percentage for the progress bar (0-100)
  const progress = (currentStep / totalSteps) * 100;

  /**
   * Handle "Skip for now" button click.
   * 
   * Allows users to defer profile completion without blocking platform access.
   * Sets a flag in sessionStorage (persists for current session only) and redirects
   * to the dashboard. The dashboard will show a persistent banner prompting completion.
   * 
   * Why sessionStorage?
   * - Persists across page refreshes within the same session
   * - Cleared when browser tab is closed (user will be re-prompted on next login)
   * - Doesn't pollute localStorage with temporary flags
   * 
   * Consequences:
   * - User can explore platform features
   * - Profile status remains isComplete: false
   * - Banner shown on dashboard until profile is completed
   * - Some features may be restricted (future enhancement)
   */
  const handleSkip = () => {
    sessionStorage.setItem("skippedOnboarding", "true");
    setLocation("/organizer/dashboard");
  };

  /**
   * Handle "Next" button click to progress to the next step.
   * 
   * Implements step-by-step validation to provide immediate feedback and prevent
   * users from progressing with invalid data. Only validates fields relevant to
   * the current step, reducing cognitive load.
   * 
   * Validation Strategy:
   * - Step 1: organizationName, description
   * - Step 2: contactPerson (nested object with name, email, phone)
   * - Step 3: No validation (both fields optional)
   * 
   * The form.trigger() method validates specified fields and returns a boolean.
   * If validation passes, we increment currentStep to show the next step.
   * If validation fails, error messages are displayed below the invalid fields.
   * 
   * @async Validation is asynchronous to support async validators (e.g., API checks)
   */
  const handleNext = async () => {
    // Define which fields to validate based on current step
    let fieldsToValidate: (keyof OnboardingFormData)[] = [];

    if (currentStep === 1) {
      // Step 1: Organization details
      fieldsToValidate = ["organizationName", "description"];
    } else if (currentStep === 2) {
      // Step 2: Contact person (validates all nested fields)
      fieldsToValidate = ["contactPerson"];
    }
    // Step 3: No validation needed (both fields are optional)

    // Trigger validation for the specified fields
    const isValid = await form.trigger(fieldsToValidate);
    
    // Only progress if validation passed and we're not on the last step
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Handle "Back" button click to return to the previous step.
   * 
   * Simple navigation logic - no validation needed when going backwards.
   * Users can freely navigate back to review or edit previous steps.
   * Form data is preserved across step transitions.
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Handle final form submission (triggered by "Complete Setup" button on step 3).
   * 
   * Data Processing:
   * 1. Filter out empty pastEventReferences (user may have added blank lines)
   * 2. Trigger mutation to POST /api/organizer/profile/complete
   * 3. On success, redirect to dashboard with full platform access
   * 
   * Server-Side Effects:
   * - Sets metadata.profileComplete = true
   * - Initializes metadata.trustScore = 50
   * - Stores organizationName → promoters.name
   * - Stores description → promoters.description
   * - Stores contactPerson → promoters.contact_person (JSONB)
   * - Stores website, pastEventReferences → promoters.metadata (JSONB)
   * 
   * Error Handling:
   * - Handled by useCompleteOnboarding hook (shows toast notification)
   * - User can retry submission if it fails
   * - Form data is preserved on error
   * 
   * @param data - Validated form data from React Hook Form
   */
  const onSubmit = (data: OnboardingFormData) => {
    // Clean up pastEventReferences: remove empty strings from array
    // This handles cases where user added blank lines in the textarea
    const payload = {
      ...data,
      pastEventReferences: data.pastEventReferences?.filter(ref => ref.trim() !== "") || undefined,
    };

    // Trigger the mutation to submit data to the server
    completeMutation.mutate(payload, {
      onSuccess: () => {
        // Redirect to dashboard on successful completion
        // User now has full platform access with profileComplete = true
        setLocation("/organizer/dashboard");
      },
      // onError is handled by the useCompleteOnboarding hook (shows toast)
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[128px]" />

      <Card className="w-full max-w-2xl glass-card border-white/10 relative z-10">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-display font-bold">
            Complete Your Organizer Profile
          </CardTitle>
          <CardDescription>
            Step {currentStep} of {totalSteps}
          </CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Organization Details */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    {...form.register("organizationName")}
                    placeholder="e.g. Sunrise Events"
                    className="bg-background/50"
                  />
                  {form.formState.errors.organizationName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.organizationName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Tell us about your organization and the events you create..."
                    rows={6}
                    className="bg-background/50 resize-none"
                  />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters, maximum 2000 characters
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Contact Person */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Person Name *</Label>
                  <Input
                    id="contactName"
                    {...form.register("contactPerson.name")}
                    placeholder="e.g. Rahul Kumar"
                    className="bg-background/50"
                  />
                  {form.formState.errors.contactPerson?.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.contactPerson.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...form.register("contactPerson.email")}
                    placeholder="e.g. rahul@sunrise.events"
                    className="bg-background/50"
                  />
                  {form.formState.errors.contactPerson?.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.contactPerson.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    {...form.register("contactPerson.phone")}
                    placeholder="e.g. +919876543210"
                    className="bg-background/50"
                  />
                  {form.formState.errors.contactPerson?.phone && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.contactPerson.phone.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g. +91 for India)
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Website and References */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    {...form.register("website")}
                    placeholder="https://yourwebsite.com"
                    className="bg-background/50"
                  />
                  {form.formState.errors.website && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastEvents">Past Event References (Optional)</Label>
                  <Textarea
                    id="pastEvents"
                    placeholder="Add links or descriptions of past events (one per line)&#10;e.g. https://instagram.com/p/event123&#10;e.g. Organized Techno Night at Blue Frog, March 2025"
                    rows={5}
                    className="bg-background/50 resize-none"
                    defaultValue={form.watch('pastEventReferences')?.join('\n') || ''}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                      form.setValue('pastEventReferences', lines);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add links or descriptions to help build credibility
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
              </div>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={completeMutation.isPending}
                  className="bg-primary"
                >
                  {completeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Complete Setup
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
