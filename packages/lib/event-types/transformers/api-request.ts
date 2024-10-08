import { z } from "zod";

import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookingWindowPeriodOutputTypeEnum_2024_06_14,
  BookingLimitsEnum_2024_06_14,
} from "@calcom/platform-enums/monorepo";
import {
  type CreateEventTypeInput_2024_06_14,
  type Integration_2024_06_14,
  type BusinessDaysWindow_2024_06_14,
  type RangeWindow_2024_06_14,
  type TransformFutureBookingsLimitSchema_2024_06_14,
  type BookingLimitsKeyOutputType_2024_06_14,
  type TransformBookingLimitsSchema_2024_06_14,
} from "@calcom/platform-types";

const integrationsMapping: Record<Integration_2024_06_14, string> = {
  "cal-video": "integrations:daily",
};

function transformApiEventTypeLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
  if (!inputLocations) {
    return [];
  }

  return inputLocations.map((location) => {
    const { type } = location;
    switch (type) {
      case "address":
        return { type: "inPerson", address: location.address, displayLocationPublicly: location.public };
      case "link":
        return { type: "link", link: location.link, displayLocationPublicly: location.public };
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel };
      case "phone":
        return {
          type: "userPhone",
          hostPhoneNumber: location.phone,
          displayLocationPublicly: location.public,
        };
      default:
        throw new Error(`Unsupported location type '${type}'`);
    }
  });
}

const integrationsMappingSchema = {
  "cal-video": z.literal("integrations:daily"),
};

const InPersonSchema = z.object({
  type: z.literal("inPerson"),
  address: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const LinkSchema = z.object({
  type: z.literal("link"),
  link: z.string().url(),
  displayLocationPublicly: z.boolean().default(false),
});

const IntegrationSchema = z.object({
  type: z.union([integrationsMappingSchema["cal-video"], integrationsMappingSchema["cal-video"]]),
});

const UserPhoneSchema = z.object({
  type: z.literal("userPhone"),
  hostPhoneNumber: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const TransformedLocationSchema = z.union([InPersonSchema, LinkSchema, IntegrationSchema, UserPhoneSchema]);
export const TransformedLocationsSchema = z.array(TransformedLocationSchema);

function transformApiEventTypeBookingFields(
  inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]
) {
  if (!inputBookingFields) {
    return [];
  }

  const customBookingFields = inputBookingFields.map((field) => {
    const commonFields: UserField = {
      name: field.slug,
      type: field.type,
      label: field.label,
      sources: [
        {
          id: "user",
          type: "user",
          label: "User",
          fieldRequired: true,
        },
      ],
      editable: "user",
      required: field.required,
      placeholder: "placeholder" in field && field.placeholder ? field.placeholder : "",
    };

    const options = "options" in field && field.options ? transformSelectOptions(field.options) : undefined;

    if (!options) {
      return commonFields;
    }

    return {
      ...commonFields,
      options,
    };
  });

  return customBookingFields;
}

function transformApiEventTypeIntervalLimits(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingLimitsCount"]
) {
  const res: TransformBookingLimitsSchema_2024_06_14 = {};
  inputBookingLimits &&
    Object.entries(inputBookingLimits).map(([key, value]) => {
      const outputKey: BookingLimitsKeyOutputType_2024_06_14 = BookingLimitsEnum_2024_06_14[
        key as keyof typeof BookingLimitsEnum_2024_06_14
      ] as BookingLimitsKeyOutputType_2024_06_14;
      res[outputKey] = value;
    });
  return res;
}

function transformApiEventTypeFutureBookingLimits(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingWindow"]
): TransformFutureBookingsLimitSchema_2024_06_14 | undefined {
  switch (inputBookingLimits?.type) {
    case BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: !!(inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: false,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: !!(inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: true,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.range:
      return {
        periodType: BookingWindowPeriodOutputTypeEnum_2024_06_14.RANGE,
        periodStartDate: new Date((inputBookingLimits as RangeWindow_2024_06_14).value[0]),
        periodEndDate: new Date((inputBookingLimits as RangeWindow_2024_06_14).value[1]),
      };
    default:
      return undefined;
  }
}

export function transformSelectOptions(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}

const FieldTypeEnum = z.enum([
  "number",
  "boolean",
  "address",
  "name",
  "text",
  "textarea",
  "email",
  "phone",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "radioInput",
]);

const UserFieldsSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum,
  label: z.string(),
  sources: z.array(
    z.object({
      id: z.literal("user"),
      type: z.literal("user"),
      label: z.literal("User"),
      fieldRequired: z.literal(true),
    })
  ),
  editable: z.literal("user"),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

const SystemFieldsSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum,
  defaultLabel: z.string(),
  label: z.string().optional(),
  editable: z.enum(["system-but-optional", "system"]),
  sources: z.array(
    z.object({
      id: z.literal("default"),
      type: z.literal("default"),
      label: z.literal("Default"),
    })
  ),
  views: z
    .array(
      z.object({
        id: z.enum(["reschedule"]),
        label: z.string(),
      })
    )
    .optional(),
  defaultPlaceholder: z.enum(["", "share_additional_notes", "email", "reschedule_placeholder"]).optional(),
  hidden: z.boolean().optional(),
  required: z.boolean(),
  hideWhenJustOneOption: z.boolean().optional(),
  getOptionsAt: z.enum(["locations"]).optional(),
  optionsInputs: z
    .object({
      attendeeInPerson: z.object({
        type: z.literal("address"),
        required: z.boolean(),
        placeholder: z.string(),
      }),
      phone: z.object({
        type: z.literal("phone"),
        required: z.boolean(),
        placeholder: z.string(),
      }),
    })
    .optional(),
});

export type SystemField = z.infer<typeof SystemFieldsSchema>;

export type UserField = z.infer<typeof UserFieldsSchema>;

export const BookingFieldsSchema = z.array(z.union([UserFieldsSchema, SystemFieldsSchema]));

export {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeFutureBookingLimits,
};
