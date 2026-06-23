import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getMyAnswers, getMyScores, getMyWeights } from "@/lib/quiz-data";
import { signPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { UserProfile } from "@/components/UserProfile";
import { TabBar } from "@/components/TabBar";

export default async function HomePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  const supabase = await createClient();
  const [photos, answers, scores, weights] = await Promise.all([
    signPhotoUrls(supabase, profile.photos),
    getMyAnswers(userId),
    getMyScores(userId),
    getMyWeights(userId),
  ]);

  return (
    <>
      <UserProfile profile={profile} answers={answers} scores={scores} weights={weights} photos={photos} />
      <TabBar />
    </>
  );
}
