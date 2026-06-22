import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getMyAnswers, getMyScores, getMyWeights, getMyQuestions, getMyWomanAnswers } from "@/lib/quiz-data";
import { signPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { ManProfile } from "@/components/ManProfile";
import { WomanProfile } from "@/components/WomanProfile";
import { TabBar } from "@/components/TabBar";

export default async function HomePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");

  const supabase = await createClient();
  const photos = await signPhotoUrls(supabase, profile.photos);

  if (profile.role === "woman") {
    const [weights, answers, questions] = await Promise.all([
      getMyWeights(userId),
      getMyWomanAnswers(userId),
      getMyQuestions(userId),
    ]);
    return (
      <>
        <WomanProfile profile={profile} weights={weights} answers={answers} questions={questions} photos={photos} />
        <TabBar isWoman />
      </>
    );
  }

  const [answers, scores] = await Promise.all([
    getMyAnswers(userId),
    getMyScores(userId),
  ]);
  return (
    <>
      <ManProfile profile={profile} answers={answers} scores={scores} photos={photos} />
      <TabBar isWoman={false} />
    </>
  );
}
