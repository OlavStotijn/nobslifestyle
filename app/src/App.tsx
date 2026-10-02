import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./routes/LoginPage";
import { SignupPage } from "./routes/SignupPage";
import { ForgotPasswordPage } from "./routes/ForgotPasswordPage";
import { ResetPasswordPage } from "./routes/ResetPasswordPage";
import { VerifyEmailPage } from "./routes/VerifyEmailPage";
import { VerifyEmailRequiredPage } from "./routes/VerifyEmailRequiredPage";
import { RootPage } from "./routes/RootPage";
import { OnboardingPage } from "./routes/OnboardingPage";
import { FoodPage } from "./routes/FoodPage";
import { AddFoodPage } from "./routes/AddFoodPage";
import { FoodWeekPage } from "./routes/FoodWeekPage";
import { MealBuilderPage } from "./routes/MealBuilderPage";
import { WorkoutsPage } from "./routes/WorkoutsPage";
import { NewSchemaPage } from "./routes/NewSchemaPage";
import { SchemaEditPage } from "./routes/SchemaEditPage";
import { SessionRunnerPage } from "./routes/SessionRunnerPage";
import { ShareWorkoutPage } from "./routes/ShareWorkoutPage";
import { CardioSessionPage } from "./routes/CardioSessionPage";
import { FriendsPage } from "./routes/FriendsPage";
import { AddFriendPage } from "./routes/AddFriendPage";
import { FriendProfilePage } from "./routes/FriendProfilePage";
import { FeedPage } from "./routes/FeedPage";
import { ProfilePage } from "./routes/ProfilePage";
import { SettingsPage } from "./routes/SettingsPage";
import { AddProgressPhotoPage } from "./routes/AddProgressPhotoPage";
import { PersonalRecordsPage } from "./routes/PersonalRecordsPage";
import { ProgramsPage } from "./routes/ProgramsPage";
import { ChecklistPage } from "./routes/ChecklistPage";
import { ChecklistFormPage } from "./routes/ChecklistFormPage";
import { ReportsPage } from "./routes/ReportsPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { useSyncListener } from "./api/hooks/useSyncListener";
import { PrivacyPolicyPage } from "./routes/PrivacyPolicyPage";
import { TermsOfServicePage } from "./routes/TermsOfServicePage";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { HomePage } from "./routes/HomePage";

export default function App() {
  useSyncListener();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<RootPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/verify-email-required" element={<VerifyEmailRequiredPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/food/add" element={<AddFoodPage />} />
          <Route path="/food/week" element={<FoodWeekPage />} />
          <Route path="/food/meals/new" element={<MealBuilderPage />} />
          <Route path="/workouts/new" element={<NewSchemaPage />} />
          <Route path="/workouts/:id/edit" element={<SchemaEditPage />} />
          <Route path="/sessions/:id" element={<SessionRunnerPage />} />
          <Route path="/sessions/:id/share" element={<ShareWorkoutPage />} />
          <Route path="/cardio/:activityType" element={<CardioSessionPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friends/add" element={<AddFriendPage />} />
          <Route path="/friends/:id" element={<FriendProfilePage />} />
          <Route path="/profile/settings" element={<SettingsPage />} />
          <Route path="/profile/progress-photos/add" element={<AddProgressPhotoPage />} />
          <Route path="/progress/prs" element={<PersonalRecordsPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/checklist/new" element={<ChecklistFormPage />} />
          <Route path="/checklist/:id/edit" element={<ChecklistFormPage />} />

          <Route element={<AppLayout />}>
            <Route path="/checklist" element={<ChecklistPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/food" element={<FoodPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsentBanner />
    </>
  );
}
