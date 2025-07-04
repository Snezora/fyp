import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Colors from "@/src/constants/Colors";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import fetchListofAccounts from "@/src/providers/fetchListofAccounts";
import { Account } from "@/assets/data/types";
import * as LocalAuthentication from "expo-local-authentication";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

// TODO: TRY AND SEE IF UPLOAD FILE IS DOABLE

const schema = yup.object().shape({
  loan_amount: yup
    .number()
    .min(1000, "Minimum loan amount is $1,000")
    .max(100000, "Maximum loan amount is $100,000")
    .required("Loan amount is required"),
  loan_intent: yup.string().required("Please select a loan purpose"),
  account_number: yup.string().required("Please select an account"),
  customer_annual_income: yup
    .number()
    .min(20000, "Minimum annual income requirement is $20,000")
    .required("Annual income is required"),
  customer_job_title: yup
    .string()
    .min(2, "Job title must be at least 2 characters")
    .required("Job title is required"),
  customer_home_ownership: yup
    .string()
    .required("Please select home ownership status"),
  customer_employment_length: yup
    .number()
    .min(0, "Employment length cannot be negative")
    .max(50, "Employment length cannot exceed 50 years")
    .required("Employment length is required"),
  loan_interest_rate: yup
    .number()
    .min(0.1, "Interest rate must be at least 0.1%")
    .max(50, "Interest rate cannot exceed 50%")
    .required("Desired interest rate is required"),
  loan_grade: yup
    .string()
    .oneOf(
      ["A", "B", "C", "D", "E", "F", "G"],
      "Please select a valid loan grade"
    )
    .required("Loan grade is required"),
});

const LOAN_INTENTS = [
  {
    value: "PERSONAL",
    label: "Personal",
    icon: "person",
    description: "Personal expenses and purchases",
  },
  {
    value: "MEDICAL",
    label: "Medical",
    icon: "local-hospital",
    description: "Medical bills and healthcare",
  },
  {
    value: "VENTURE",
    label: "Business",
    icon: "business",
    description: "Business investment or startup",
  },
  {
    value: "HOMEIMPROVEMENT",
    label: "Home Improvement",
    icon: "home",
    description: "Home renovation and upgrades",
  },
  {
    value: "DEBTCONSOLIDATION",
    label: "Debt Consolidation",
    icon: "account-balance",
    description: "Consolidate existing debts",
  },
  {
    value: "EDUCATION",
    label: "Education",
    icon: "school",
    description: "Educational expenses",
  },
];

const HOME_OWNERSHIP_OPTIONS = [
  { value: "RENT", label: "Rent" },
  { value: "OWN", label: "Own" },
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "OTHER", label: "Other" },
];

const LOAN_GRADE_OPTIONS = [
  {
    value: "A",
    label: "Grade A",
    description: "Excellent credit - Lowest interest rates",
  },
  {
    value: "B",
    label: "Grade B",
    description: "Very good credit - Low interest rates",
  },
  {
    value: "C",
    label: "Grade C",
    description: "Good credit - Moderate interest rates",
  },
  {
    value: "D",
    label: "Grade D",
    description: "Fair credit - Higher interest rates",
  },
  {
    value: "E",
    label: "Grade E",
    description: "Poor credit - High interest rates",
  },
  {
    value: "F",
    label: "Grade F",
    description: "Very poor credit - Very high interest rates",
  },
  {
    value: "G",
    label: "Grade G",
    description: "Bad credit - Highest interest rates",
  },
];

const NewLoanPage = () => {
  const router = useRouter();
  const isDarkMode = useColorScheme() === "dark";
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState<string>("");
  const [selectedHomeOwnership, setSelectedHomeOwnership] =
    useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedLoanGrade, setSelectedLoanGrade] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      loan_amount: 0,
      loan_intent: "",
      account_number: "",
      customer_annual_income: 0,
      customer_job_title: "",
      customer_home_ownership: "",
      customer_employment_length: 0,
      loan_interest_rate: 0,
      loan_grade: "A" as const,
    },
  });

  const watchedAmount = watch("loan_amount");

  useEffect(() => {
    const fetchAccounts = async () => {
      const isCustomer = user && "customer_id" in user;
      if (!isCustomer) return;

      try {
        const accountsData = await fetchListofAccounts({
          isMockEnabled: false,
          isAdmin: false,
          customer_id: user.customer_id,
        });

        if (accountsData) {
          const activeAccounts = accountsData.filter(
            (account) => account.account_status === "Active"
          );
          setAccounts(activeAccounts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        Alert.alert("Error", "Failed to load your accounts. Please try again.");
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [user]);

  const handleIntentSelect = (intent: string) => {
    setSelectedIntent(intent);
    setValue("loan_intent", intent);
  };

  const handleHomeOwnershipSelect = (ownership: string) => {
    setSelectedHomeOwnership(ownership);
    setValue("customer_home_ownership", ownership);
  };

  const handleAccountSelect = (accountNumber: string) => {
    setSelectedAccount(accountNumber);
    setValue("account_number", accountNumber);
  };

  const handleLoanGradeSelect = (
    grade: "A" | "B" | "C" | "D" | "E" | "F" | "G"
  ) => {
    setSelectedLoanGrade(grade);
    setValue("loan_grade", grade);
  };

  const onSubmit = async (data: any) => {
    Alert.alert(
      "Confirm Application",
      `Please review your loan application:\n\n• Loan Amount: ${formatCurrency(
        parseFloat(data.loan_amount)
      )}\n• Purpose: ${
        LOAN_INTENTS.find((intent) => intent.value === data.loan_intent)?.label
      }\n• Deposit Account: ${formatAccountNumber(
        data.account_number
      )}\n• Annual Income: ${formatCurrency(
        parseFloat(data.customer_annual_income)
      )}\n• Desired Interest Rate: ${
        data.loan_interest_rate
      }%\n• Expected Loan Grade: ${
        data.loan_grade
      }\n\nAre you sure you want to submit this application?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            const isAuthenticated = await LocalAuthentication.authenticateAsync(
              {
                promptMessage: "Authenticate to create account",
                fallbackLabel: "Enter PIN",
                cancelLabel: "Cancel",
              }
            );
            if (!isAuthenticated.success) {
              Alert.alert(
                "Authentication Failed",
                "You must authenticate to proceed."
              );
              return;
            } else {
              handleSubmitApplication(data);
            }
          },
        },
      ]
    );
  };

  const handleSubmitApplication = async (data: any) => {
    try {
      setLoading(true);

      const isCustomer = user && "customer_id" in user;
      if (!isCustomer) {
        Alert.alert("Error", "User session not found. Please log in again.");
        return;
      }

      // Prepare loan data
      const loanData = {
        customer_id: user.customer_id,
        loan_amount: parseFloat(data.loan_amount),
        loan_intent: data.loan_intent,
        account_number: data.account_number,
        customer_annual_income: parseFloat(data.customer_annual_income),
        customer_job_title: data.customer_job_title.trim(),
        customer_home_ownership: data.customer_home_ownership,
        customer_job_years: parseFloat(data.customer_employment_length),
        loan_interest_rate: parseFloat(data.loan_interest_rate),
        loan_grade: data.loan_grade,
        application_date: new Date().toISOString(),
        final_approval: null,
      };

      const { error } = await supabase.from("Loan").insert([loanData]);

      if (error) {
        console.error("Error submitting loan application:", error);
        Alert.alert(
          "Error",
          "Failed to submit loan application. Please try again."
        );
        return;
      }

      Alert.alert(
        "Application Submitted!",
        `Your loan application for ${formatCurrency(
          parseFloat(data.loan_amount)
        )} has been submitted successfully.\n\nThe funds will be deposited into account ${
          data.account_number
        } upon approval.\n\nYour application will be reviewed and you'll receive a response within 2-3 business days.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const formatAccountNumber = (accountNo: string) => {
    // Format account number for display (e.g., ***1234)
    if (accountNo.length > 4) {
      return `***${accountNo.slice(-4)}`;
    }
    return accountNo;
  };
  const getAccountTypeIcon = (accountType: string | null): string => {
    switch (accountType?.toLowerCase()) {
      case "savings":
        return "savings";
      case "checking":
        return "account-balance-wallet";
      case "business":
        return "business";
      default:
        return "account-balance";
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: Colors.light.themeColor,
        },
      ]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[
          styles.content,
          {
            backgroundColor: isDarkMode
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={50}
          keyboardShouldPersistTaps="handled"
          enableAutomaticScroll={true}
          enableResetScrollToCoords={false}
        >
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Loan Amount
            </Text>

            <Controller
              control={control}
              name="loan_amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode
                        ? Colors.dark.firstButton
                        : Colors.light.background,
                      borderColor: errors.loan_amount
                        ? "red"
                        : isDarkMode
                        ? Colors.dark.border
                        : Colors.light.border,
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                  placeholder="Enter amount (e.g., 10000)"
                  placeholderTextColor={
                    isDarkMode
                      ? Colors.dark.text + "80"
                      : Colors.light.text + "80"
                  }
                  value={String(value || "")}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="numeric"
                />
              )}
            />

            {errors.loan_amount && (
              <Text style={styles.errorText}>{errors.loan_amount.message}</Text>
            )}

            {Boolean(watchedAmount) && !errors.loan_amount && (
              <Text
                style={[styles.helperText, { color: Colors.light.themeColor }]}
              >
                Loan Amount:{" "}
                {formatCurrency(parseFloat(String(watchedAmount || "0")))}
              </Text>
            )}
          </View>
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Select Account
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: isDarkMode
                    ? Colors.dark.text + "80"
                    : Colors.light.text + "80",
                },
              ]}
            >
              Choose the account where loan funds will be deposited
            </Text>

            {loadingAccounts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={Colors.light.themeColor}
                />
                <Text
                  style={[
                    styles.loadingText,
                    {
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                >
                  Loading your accounts...
                </Text>
              </View>
            ) : accounts.length === 0 ? (
              <View style={styles.noAccountsContainer}>
                <MaterialIcons
                  name="account-balance"
                  size={48}
                  color={
                    isDarkMode
                      ? Colors.dark.text + "40"
                      : Colors.light.text + "40"
                  }
                />
                <Text
                  style={[
                    styles.noAccountsText,
                    {
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                >
                  No active accounts found
                </Text>
                <Text
                  style={[
                    styles.noAccountsSubtext,
                    {
                      color: isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80",
                    },
                  ]}
                >
                  Please create an account first to apply for a loan
                </Text>
              </View>
            ) : (
              accounts.map((account) => (
                <TouchableOpacity
                  key={account.account_no}
                  style={[
                    styles.accountCard,
                    {
                      backgroundColor: isDarkMode
                        ? Colors.dark.firstButton
                        : Colors.light.background,
                      borderColor:
                        selectedAccount === account.account_no
                          ? isDarkMode
                            ? Colors.dark.themeColorSecondary
                            : Colors.light.themeColor
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                      borderWidth:
                        selectedAccount === account.account_no ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleAccountSelect(account.account_no)}
                >
                  <View style={styles.accountHeader}>
                    <View style={styles.accountIconContainer}>
                      <MaterialIcons
                        name={getAccountTypeIcon(account.account_type) as any}
                        size={24}
                        color={
                          selectedAccount === account.account_no
                            ? isDarkMode
                              ? Colors.dark.themeColorSecondary
                              : Colors.light.themeColor
                            : isDarkMode
                            ? Colors.dark.text
                            : Colors.light.text
                        }
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text
                        style={[
                          styles.accountNickname,
                          {
                            color:
                              selectedAccount === account.account_no
                                ? isDarkMode
                                  ? Colors.dark.themeColorSecondary
                                  : Colors.light.themeColor
                                : isDarkMode
                                ? Colors.dark.text
                                : Colors.light.text,
                          },
                        ]}
                      >
                        {account.nickname ?? account.account_no}
                      </Text>
                      <Text
                        style={[
                          styles.accountDetails,
                          {
                            color: isDarkMode
                              ? Colors.dark.text + "80"
                              : Colors.light.text + "80",
                          },
                        ]}
                      >
                        {account.account_type} •{" "}
                        {formatAccountNumber(account.account_no)}
                      </Text>
                      <Text
                        style={[
                          styles.accountBalance,
                          {
                            color: isDarkMode
                              ? Colors.dark.text
                              : Colors.light.text,
                          },
                        ]}
                      >
                        Balance: {formatCurrency(account.balance)}
                      </Text>
                    </View>
                    {selectedAccount === account.account_no && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={
                          isDarkMode
                            ? Colors.dark.themeColorSecondary
                            : Colors.light.themeColor
                        }
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}

            {errors.account_number && (
              <Text style={styles.errorText}>
                {errors.account_number.message}
              </Text>
            )}
          </View>
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Loan Purpose
            </Text>

            {LOAN_INTENTS.map((intent) => (
              <TouchableOpacity
                key={intent.value}
                style={[
                  styles.intentCard,
                  {
                    backgroundColor: isDarkMode
                      ? Colors.dark.firstButton
                      : Colors.light.background,
                    borderColor:
                      selectedIntent === intent.value
                        ? isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                        : isDarkMode
                        ? Colors.dark.border
                        : Colors.light.border,
                    borderWidth: selectedIntent === intent.value ? 2 : 1,
                  },
                ]}
                onPress={() => handleIntentSelect(intent.value)}
              >
                <View style={styles.intentHeader}>
                  <MaterialIcons
                    name={intent.icon as any}
                    size={24}
                    color={
                      selectedIntent === intent.value
                        ? isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                        : isDarkMode
                        ? Colors.dark.text
                        : Colors.light.text
                    }
                  />
                  <Text
                    style={[
                      styles.intentLabel,
                      {
                        color:
                          selectedIntent === intent.value
                            ? isDarkMode
                              ? Colors.dark.themeColorSecondary
                              : Colors.light.themeColor
                            : isDarkMode
                            ? Colors.dark.text
                            : Colors.light.text,
                      },
                    ]}
                  >
                    {intent.label}
                  </Text>
                  {selectedIntent === intent.value && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={
                        isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                      }
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.intentDescription,
                    {
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                >
                  {intent.description}
                </Text>
              </TouchableOpacity>
            ))}

            {errors.loan_intent && (
              <Text style={styles.errorText}>{errors.loan_intent.message}</Text>
            )}
          </View>
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Personal Information
            </Text>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDarkMode ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Annual Income (USD)
              </Text>
              <Controller
                control={control}
                name="customer_annual_income"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode
                          ? Colors.dark.firstButton
                          : Colors.light.background,
                        borderColor: errors.customer_annual_income
                          ? "red"
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                    placeholder="Enter annual income (e.g., 50000)"
                    placeholderTextColor={
                      isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80"
                    }
                    value={String(value || "")}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.customer_annual_income && (
                <Text style={styles.errorText}>
                  {errors.customer_annual_income.message}
                </Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDarkMode ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Job Title
              </Text>
              <Controller
                control={control}
                name="customer_job_title"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode
                          ? Colors.dark.firstButton
                          : Colors.light.background,
                        borderColor: errors.customer_job_title
                          ? "red"
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                    placeholder="Enter your job title"
                    placeholderTextColor={
                      isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80"
                    }
                    value={String(value || "")}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.customer_job_title && (
                <Text style={styles.errorText}>
                  {errors.customer_job_title.message}
                </Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDarkMode ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Employment Length (years)
              </Text>
              <Controller
                control={control}
                name="customer_employment_length"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode
                          ? Colors.dark.firstButton
                          : Colors.light.background,
                        borderColor: errors.customer_employment_length
                          ? "red"
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                    placeholder="Enter employment length (e.g., 5)"
                    placeholderTextColor={
                      isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80"
                    }
                    value={String(value || "")}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.customer_employment_length && (
                <Text style={styles.errorText}>
                  {errors.customer_employment_length.message}
                </Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDarkMode ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Desired Interest Rate (%)
              </Text>
              <Controller
                control={control}
                name="loan_interest_rate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode
                          ? Colors.dark.firstButton
                          : Colors.light.background,
                        borderColor: errors.loan_interest_rate
                          ? "red"
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                    placeholder="Enter desired interest rate (e.g., 5.5)"
                    placeholderTextColor={
                      isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80"
                    }
                    value={String(value || "")}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.loan_interest_rate && (
                <Text style={styles.errorText}>
                  {errors.loan_interest_rate.message}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Expected Loan Grade
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: isDarkMode
                    ? Colors.dark.text + "80"
                    : Colors.light.text + "80",
                },
              ]}
            >
              Select credit grade based on your known credit history
            </Text>

            {LOAN_GRADE_OPTIONS.map((grade) => (
              <TouchableOpacity
                key={grade.value}
                style={[
                  styles.gradeCard,
                  {
                    backgroundColor: isDarkMode
                      ? Colors.dark.firstButton
                      : Colors.light.background,
                    borderColor:
                      selectedLoanGrade === grade.value
                        ? isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                        : isDarkMode
                        ? Colors.dark.border
                        : Colors.light.border,
                    borderWidth: selectedLoanGrade === grade.value ? 2 : 1,
                  },
                ]}
                onPress={() =>
                  handleLoanGradeSelect(
                    grade.value as "A" | "B" | "C" | "D" | "E" | "F" | "G"
                  )
                }
              >
                <View style={styles.gradeHeader}>
                  <Text
                    style={[
                      styles.gradeLabel,
                      {
                        color:
                          selectedLoanGrade === grade.value
                            ? isDarkMode
                              ? Colors.dark.themeColorSecondary
                              : Colors.light.themeColor
                            : isDarkMode
                            ? Colors.dark.text
                            : Colors.light.text,
                      },
                    ]}
                  >
                    {grade.label}
                  </Text>
                  {selectedLoanGrade === grade.value && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={
                        isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                      }
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.gradeDescription,
                    {
                      color: isDarkMode
                        ? Colors.dark.text + "80"
                        : Colors.light.text + "80",
                    },
                  ]}
                >
                  {grade.description}
                </Text>
              </TouchableOpacity>
            ))}

            {errors.loan_grade && (
              <Text style={styles.errorText}>{errors.loan_grade.message}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Home Ownership
            </Text>

            <View style={styles.homeOwnershipContainer}>
              {HOME_OWNERSHIP_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.homeOwnershipOption,
                    {
                      backgroundColor:
                        selectedHomeOwnership === option.value
                          ? isDarkMode
                            ? Colors.dark.themeColorSecondary + "20"
                            : Colors.light.themeColor + "20"
                          : isDarkMode
                          ? Colors.dark.firstButton
                          : Colors.light.background,
                      borderColor:
                        selectedHomeOwnership === option.value
                          ? isDarkMode
                            ? Colors.dark.themeColorSecondary
                            : Colors.light.themeColor
                          : isDarkMode
                          ? Colors.dark.border
                          : Colors.light.border,
                    },
                  ]}
                  onPress={() => handleHomeOwnershipSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.homeOwnershipText,
                      {
                        color:
                          selectedHomeOwnership === option.value
                            ? isDarkMode
                              ? Colors.dark.themeColorSecondary
                              : Colors.light.themeColor
                            : isDarkMode
                            ? Colors.dark.text
                            : Colors.light.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedHomeOwnership === option.value && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={
                        isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor
                      }
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {errors.customer_home_ownership && (
              <Text style={styles.errorText}>
                {errors.customer_home_ownership.message}
              </Text>
            )}
          </View>

          {Boolean(watchedAmount) &&
            Boolean(selectedIntent) &&
            Boolean(selectedAccount) && (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: isDarkMode
                      ? Colors.dark.firstButton
                      : Colors.light.background,
                    borderColor: isDarkMode
                      ? Colors.dark.themeColorSecondary
                      : Colors.light.themeColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.summaryTitle,
                    {
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                >
                  Application Summary
                </Text>

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                  >
                    Loan Amount:
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color: isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor,
                      },
                    ]}
                  >
                    {formatCurrency(parseFloat(String(watchedAmount || "0")))}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                  >
                    Purpose:
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color: isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor,
                      },
                    ]}
                  >
                    {
                      LOAN_INTENTS.find(
                        (intent) => intent.value === selectedIntent
                      )?.label
                    }
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color: isDarkMode
                          ? Colors.dark.text
                          : Colors.light.text,
                      },
                    ]}
                  >
                    Deposit Account:
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color: isDarkMode
                          ? Colors.dark.themeColorSecondary
                          : Colors.light.themeColor,
                      },
                    ]}
                  >
                    {formatAccountNumber(selectedAccount)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.summaryNote,
                    {
                      color: isDarkMode ? Colors.dark.text : Colors.light.text,
                    },
                  ]}
                >
                  Your application will be reviewed and you'll receive a
                  response within 2-3 business days. Upon approval, funds will
                  be deposited into your selected account.
                </Text>
              </View>
            )}
        </KeyboardAwareScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: loading
                  ? Colors.light.themeColor + "80"
                  : Colors.light.themeColor,
              },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: Colors.light.themeColor,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: "500",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  noAccountsContainer: {
    alignItems: "center",
    padding: 30,
  },
  noAccountsText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
  },
  noAccountsSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  accountCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 12,
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  accountInfo: {
    flex: 1,
  },
  accountNickname: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  accountDetails: {
    fontSize: 12,
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "500",
  },
  intentCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  intentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  intentLabel: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  intentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  homeOwnershipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  homeOwnershipOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "48%",
    gap: 8,
  },
  homeOwnershipText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryNote: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 16,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "transparent",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  gradeCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  gradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  gradeLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  gradeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NewLoanPage;
