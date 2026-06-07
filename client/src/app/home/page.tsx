import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getMyAnswers, getMyScores, getMyWeights, getMyQuestions } from "@/lib/quiz-data";
import { ManProfile } from "@/components/ManProfile";
import { WomanProfile } from "@/components/WomanProfile";
import { TabBar } from "@/components/TabBar";

export default async function HomePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");

  if (profile.role === "woman") {
    const [weights, questions] = await Promise.all([
      getMyWeights(userId),
      getMyQuestions(userId),
    ]);
    return (
      <>
        <WomanProfile profile={profile} weights={weights} questions={questions} />
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
      <ManProfile profile={profile} answers={answers} scores={scores} />
      <TabBar isWoman={false} />
    </>
  );
}
