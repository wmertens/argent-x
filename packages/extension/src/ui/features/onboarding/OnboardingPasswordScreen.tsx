import { Box, FormControl } from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FC, MouseEventHandler, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AllowPromise } from "../../../shared/storage/types"
import { ControlledInput } from "../../components/ControlledInput"
import { OnboardingButton } from "./ui/OnboardingButton"
import { OnboardingScreen } from "./ui/OnboardingScreen"
import { PasswordStrengthIndicator } from "@argent/ui"

const MIN_PASSWORD_LENGTH = 8
const setPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Must contain at least ${MIN_PASSWORD_LENGTH} characters`,
      ),
    repeatPassword: z.string(), // not using passwordSchema here, as we want to show a different error message
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  })

type PasswordForm = z.infer<typeof setPasswordFormSchema>

export interface OnboardingPasswordScreenProps {
  title?: string
  submitText?: {
    start: string
    submitting: string
    retryAfterError?: string
  }
  onSubmit: (password: string) => AllowPromise<void>
  onBack?: MouseEventHandler
}

export const OnboardingPasswordScreen: FC<OnboardingPasswordScreenProps> = ({
  title = "Password",
  submitText,
  onBack,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PasswordForm>({
    criteriaMode: "firstError",
    resolver: zodResolver(setPasswordFormSchema),
    defaultValues: {
      password: "",
      repeatPassword: "",
    },
  })

  const submitButtonText = useMemo(
    () =>
      errors.root?.message
        ? submitText?.retryAfterError ?? "Retry create wallet"
        : isSubmitting
        ? submitText?.submitting ?? "Creating wallet…"
        : submitText?.start ?? "Create wallet",
    [isSubmitting, errors.root?.message, submitText],
  )

  const handleForm = handleSubmit(async ({ password }) => {
    try {
      await onSubmit(password)
    } catch (error) {
      setError("root", { message: "Something went wrong" })
    }
  })

  return (
    <OnboardingScreen
      onBack={onBack}
      length={3}
      currentIndex={1}
      title={title}
      subtitle="Enter a password to protect your wallet"
    >
      <FormControl
        as="form"
        display={"flex"}
        flexDirection={"column"}
        gap={3}
        onSubmit={handleForm}
      >
        <ControlledInput
          name="password"
          control={control}
          autoFocus
          type="password"
          placeholder="Password"
          isDisabled={isSubmitting}
        />
        <PasswordStrengthIndicator password={watch("password")} />
        <ControlledInput
          name="repeatPassword"
          control={control}
          type="password"
          placeholder="Repeat password"
          isDisabled={isSubmitting}
        />
        <Box>
          <OnboardingButton
            mt={5}
            type="submit"
            isDisabled={!isDirty || isSubmitting}
          >
            {submitButtonText}
          </OnboardingButton>
        </Box>
      </FormControl>
    </OnboardingScreen>
  )
}
