import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./routes/LoginPage";
import { SignupPage } from "./routes/SignupPage";
import { ForgotPasswordPage } from "./routes/ForgotPasswordPage";
import { ResetPasswordPage } from "./routes/ResetPasswordPage";
import { VerifyEmailPage } from "./routes/VerifyEmailPage";
import { VerifyEmailRequiredPage } from "./routes/VerifyEmailRequiredPage";
import { RootRedirectPage } from "./routes/RootRedirectPage";
import { SummaryPage } from "./routes/SummaryPage";
import { OnboardingPage } from "./routes/OnboardingPage";
import { FoodPage } from "./routes/FoodPage";
import { AddFoodPage } from "./routes/AddFoodPage";
import { WorkoutsPage } from "./routes/WorkoutsPage";
import { NewSchemaPage } from "./routes/NewSchemaPage";
import { SchemaEditPage } from "./routes/SchemaEditPage";
import { SessionRunnerPage } from "./routes/SessionRunnerPage";
import { CardioSessionPage } from "./routes/CardioSessionPage";
import { FriendsPage } from "./routes/FriendsPage";
import { AddFriendPage } from "./routes/AddFriendPage";
import { FriendProfilePage } from "./routes/FriendProfilePage";
import { FeedPage } from "./routes/FeedPage";
import { ProfilePage } from "./routes/ProfilePage";
import { SettingsPage } from "./routes/SettingsPage";
import { AddProgressPhotoPage } from "./routes/AddProgressPhotoPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { useSyncListener } from "./api/hooks/useSyncListener";

export default function App() {
  useSyncListener();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RootRedirectPage />} />
        <Route path="/verify-email-required" element={<VerifyEmailRequiredPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/food/add" element={<AddFoodPage />} />
        <Route path="/workouts/new" element={<NewSchemaPage />} />
        <Route path="/workouts/:id/edit" element={<SchemaEditPage />} />
        <Route path="/sessions/:id" element={<SessionRunnerPage />} />
        <Route path="/cardio/:activityType" element={<CardioSessionPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/friends/add" element={<AddFriendPage />} />
        <Route path="/friends/:id" element={<FriendProfilePage />} />
        <Route path="/profile/settings" element={<SettingsPage />} />
        <Route path="/profile/progress-photos/add" element={<AddProgressPhotoPage />} />

        <Route element={<AppLayout />}>
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
