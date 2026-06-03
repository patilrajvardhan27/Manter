import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ─── Men ──────────────────────────────────────────────────────────────────────

const MEN = [
  {
    user: {
      email: 'arjun.sharma@example.com',
      name: 'Arjun Sharma',
      age: 27,
      bio: 'Software engineer who loves hiking and cooking. I believe in equal partnerships and having real conversations.',
      city: 'Bangalore',
    },
    quizAnswers: [
      {
        questionId: 'q_conflict',
        scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
        question: 'What do you do, and why?',
        answer: 'I stop talking and actually listen — not to respond, but to understand. If she is hurt, that is real regardless of my intention. I would acknowledge what she felt, say sorry genuinely, and then ask what I can do differently next time. I know my instinct is to explain myself first but I have learned that makes things worse.',
      },
      {
        questionId: 'q_success',
        scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
        question: 'How do you feel about it, and how does it affect the relationship?',
        answer: 'Honestly proud. Her success is not a threat to me — it is something we both worked toward. I would celebrate it properly, take her out, tell the people we know. I grew up watching my dad feel insecure about my mum earning more and it damaged their marriage. I promised myself I would not be that man.',
      },
      {
        questionId: 'q_boundary',
        scenario: 'You want to be physical but your partner says she is not ready yet.',
        question: 'What do you do next, and how do you handle your own feelings about it?',
        answer: 'I respect it completely and move on without making her feel bad about it. I might feel frustrated but that is mine to manage, not hers to fix. I would probably go for a run or just redirect that energy elsewhere. No sulking, no passive withdrawal. She owes me nothing on that front.',
      },
      {
        questionId: 'q_household',
        scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
        question: 'What does a typical evening look like in your home when she is worn out?',
        answer: 'I would already have something started or ordered. If I cooked, I plate it and let her decompress first — she might want quiet, she might want to vent. I follow her lead. Dishes are mine that night. I genuinely do not see this as "helping her" — it is just the household, we both live here.',
      },
      {
        questionId: 'q_friends',
        scenario: 'Your close friends make a sexist joke about women in the group chat.',
        question: 'What do you do in that moment, and why?',
        answer: 'I call it out directly in the chat. Something like "that is not funny, come on." I have done this before — it is uncomfortable for about 30 seconds and then it moves on. The ones who matter respect it. I am not interested in keeping friendships that require me to stay quiet about this stuff.',
      },
      {
        questionId: 'q_feelings',
        scenario: 'You are going through a difficult time — work stress, family pressure.',
        question: 'How do you handle this with your partner?',
        answer: 'I tell her what is going on, not everything at once but I do not pretend everything is fine either. I am not great at asking for support directly but I have been working on it. I try to name what I actually need — sometimes just to be heard, sometimes space. Bottling it up just makes me irritable and that is not fair to her.',
      },
    ],
    qualityScores: {
      q1: 9, q2: 8, q3: 9, q4: 8, q5: 8, q6: 8, q7: 7, q8: 9,
      q9: 9, q10: 7, q11: 9, q12: 8, q13: 8, q14: 8, q15: 7, q16: 9,
      q17: 8, q18: 9, q19: 9, q20: 8, q21: 8, q22: 8, q23: 8,
    },
  },
  {
    user: {
      email: 'rahul.verma@example.com',
      name: 'Rahul Verma',
      age: 30,
      bio: 'Finance guy, weekend cricketer. Direct and honest. Looking for something real, not just something convenient.',
      city: 'Mumbai',
    },
    quizAnswers: [
      {
        questionId: 'q_conflict',
        scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
        question: 'What do you do, and why?',
        answer: 'I try to listen but I will be honest — my first instinct is to explain why I said it. I have been told that comes across as defensive. I am working on it. I do apologise when I realise I actually hurt her, but I sometimes need a bit of time to process before I can do that genuinely.',
      },
      {
        questionId: 'q_success',
        scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
        question: 'How do you feel about it, and how does it affect the relationship?',
        answer: 'I would feel genuinely happy for her. I might have a moment of "I need to step up my own game" but that is about me, not about feeling threatened by her. I would celebrate it. Money and seniority are not things I attach my ego to in a relationship.',
      },
      {
        questionId: 'q_boundary',
        scenario: 'You want to be physical but your partner says she is not ready yet.',
        question: 'What do you do next, and how do you handle your own feelings about it?',
        answer: 'Respect it and drop it. I have had this situation before and I just said okay and we did something else. There was a moment of frustration that I kept to myself — I did not express it to her because that would just be pressure in a different form.',
      },
      {
        questionId: 'q_household',
        scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
        question: 'What does a typical evening look like in your home when she is worn out?',
        answer: 'I would probably order food so neither of us has to cook. I handle the logistics — placing the order, setting up. I am not a great cook so the cooking split in a real relationship would not be 50-50 on my side, I will be honest. But I make up for it in other ways — I do all the laundry and handle everything administrative.',
      },
      {
        questionId: 'q_friends',
        scenario: 'Your close friends make a sexist joke about women in the group chat.',
        question: 'What do you do in that moment, and why?',
        answer: 'I would probably react with a "really bro?" type message. I do not always make a big thing of it but I do not stay silent or laugh along. My close friends know where I stand. It depends how bad the joke is — mild stupidity I might ignore, anything actually offensive I call out.',
      },
      {
        questionId: 'q_feelings',
        scenario: 'You are going through a difficult time — work stress, family pressure.',
        question: 'How do you handle this with your partner?',
        answer: 'I tend to handle it on my own first — I am not a big talker about feelings. But if she asks or notices, I will tell her. I do not fully open up easily but with the right person I get there. I have shared things with past partners that I have not told anyone else, so it is about trust building over time.',
      },
    ],
    qualityScores: {
      q1: 7, q2: 7, q3: 8, q4: 7, q5: 6, q6: 6, q7: 6, q8: 7,
      q9: 6, q10: 7, q11: 8, q12: 7, q13: 8, q14: 5, q15: 6, q16: 7,
      q17: 8, q18: 7, q19: 6, q20: 7, q21: 7, q22: 7, q23: 7,
    },
  },
  {
    user: {
      email: 'dev.nair@example.com',
      name: 'Dev Nair',
      age: 25,
      bio: 'Illustrator and part-time barista. Quiet person, deep thinker. Big on honesty and small on drama.',
      city: 'Kochi',
    },
    quizAnswers: [
      {
        questionId: 'q_conflict',
        scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
        question: 'What do you do, and why?',
        answer: 'I go quiet and really absorb what she is saying. I tend to feel things intensely so I need a second to not be reactive. Then I come back and say exactly what I understood — I repeat it back to her so she knows I heard her correctly. Then I apologise for the impact. The intention versus impact thing matters a lot to me.',
      },
      {
        questionId: 'q_success',
        scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
        question: 'How do you feel about it, and how does it affect the relationship?',
        answer: 'I would feel proud and probably a bit inspired. I have never measured my worth by salary or job title. I would want to take her out, mark it properly. If anything it might make me reflect on my own ambitions — but in a healthy way, not in a competitive way.',
      },
      {
        questionId: 'q_boundary',
        scenario: 'You want to be physical but your partner says she is not ready yet.',
        question: 'What do you do next, and how do you handle your own feelings about it?',
        answer: 'I let it go completely. Her readiness is the only thing that matters here. I would want her to feel safe, not pressured. I might journal about my own feelings later — I do that sometimes. The worst thing I could do is let her feel like she owes me something.',
      },
      {
        questionId: 'q_household',
        scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
        question: 'What does a typical evening look like in your home when she is worn out?',
        answer: 'I enjoy cooking so I would have something ready. I would give her space to decompress — maybe run a bath, keep things quiet. I am quite domestic honestly. I find cooking calming. The chores split naturally in my previous relationship because I genuinely like keeping a clean space.',
      },
      {
        questionId: 'q_friends',
        scenario: 'Your close friends make a sexist joke about women in the group chat.',
        question: 'What do you do in that moment, and why?',
        answer: 'I say something. My friends know this about me — I have never laughed along with that kind of humour. I would say directly that it is not funny. A few friendships have gotten awkward because of this. I have decided I would rather have fewer friends who think carefully than a big group where I have to perform a version of myself I am not.',
      },
      {
        questionId: 'q_feelings',
        scenario: 'You are going through a difficult time — work stress, family pressure.',
        question: 'How do you handle this with your partner?',
        answer: 'I share it. Maybe not immediately but within a day or two. I process through talking — it helps me understand what I am actually feeling. I do not want to carry things alone and I do not want a partner who has to guess that something is wrong. That kind of emotional unavailability does real damage.',
      },
    ],
    qualityScores: {
      q1: 9, q2: 9, q3: 9, q4: 9, q5: 9, q6: 9, q7: 9, q8: 9,
      q9: 9, q10: 7, q11: 10, q12: 9, q13: 7, q14: 9, q15: 8, q16: 10,
      q17: 6, q18: 9, q19: 8, q20: 8, q21: 9, q22: 9, q23: 9,
    },
  },
  {
    user: {
      email: 'vikram.singh@example.com',
      name: 'Vikram Singh',
      age: 33,
      bio: 'Running my own logistics startup. Work hard, play hard. Looking for a partner, not a project.',
      city: 'Delhi',
    },
    quizAnswers: [
      {
        questionId: 'q_conflict',
        scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
        question: 'What do you do, and why?',
        answer: 'I hear her out. I will admit I sometimes want to problem-solve instead of just listening — I am wired that way. But I have learned the hard way that she usually wants to feel heard first. I apologise and ask what she needs from me in that moment. I have gotten better at this over time.',
      },
      {
        questionId: 'q_success',
        scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
        question: 'How do you feel about it, and how does it affect the relationship?',
        answer: 'Genuinely fine with it. I do not have a fragile ego about money. I have had periods in my startup where I earned nothing and my last girlfriend earned three times more — it was never a problem. I would celebrate her. Her career is hers and I take pride in supporting it.',
      },
      {
        questionId: 'q_boundary',
        scenario: 'You want to be physical but your partner says she is not ready yet.',
        question: 'What do you do next, and how do you handle your own feelings about it?',
        answer: 'I respect it and we move on to something else without making it a moment. I keep my frustration to myself — it is not her job to manage that. I do expect open communication in a relationship though, so if we are dating seriously, I would eventually want to understand where she is at — not to pressure but to make sure we are on the same page about what we want.',
      },
      {
        questionId: 'q_household',
        scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
        question: 'What does a typical evening look like in your home when she is worn out?',
        answer: 'I would sort dinner — either cook or order. I am decent at a few dishes. I handle the kitchen when I have cooked, she handles it when she has. It is a genuine split. I grew up in a house where my mum did everything and I saw how draining that was — I decided I would not be that kind of partner.',
      },
      {
        questionId: 'q_friends',
        scenario: 'Your close friends make a sexist joke about women in the group chat.',
        question: 'What do you do in that moment, and why?',
        answer: 'I call it out. I might do it with a bit of humour depending on the group — something like "bro, seriously?" — but I do not let it pass. My social circle has evolved a lot in the last few years and this kind of thing comes up less now.',
      },
      {
        questionId: 'q_feelings',
        scenario: 'You are going through a difficult time — work stress, family pressure.',
        question: 'How do you handle this with your partner?',
        answer: 'I give her a heads up that I am in a tough patch without dumping everything at once. I let her know it is work related or family, not us. I do not want her to wonder why I seem off. I might not share all the details but I share enough that she is not left guessing.',
      },
    ],
    qualityScores: {
      q1: 7, q2: 7, q3: 8, q4: 8, q5: 7, q6: 7, q7: 6, q8: 7,
      q9: 7, q10: 7, q11: 8, q12: 7, q13: 9, q14: 6, q15: 6, q16: 7,
      q17: 9, q18: 7, q19: 7, q20: 9, q21: 8, q22: 7, q23: 7,
    },
  },
  {
    user: {
      email: 'aditya.kumar@example.com',
      name: 'Aditya Kumar',
      age: 29,
      bio: 'High school history teacher. Coach the school football team on weekends. Care a lot about doing the right thing.',
      city: 'Pune',
    },
    quizAnswers: [
      {
        questionId: 'q_conflict',
        scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
        question: 'What do you do, and why?',
        answer: 'I listen carefully and take it seriously. Teaching has made me better at de-escalating and actually hearing people — you cannot dismiss a feeling just because you did not intend it. I say sorry for the hurt, not just "sorry you feel that way." Then we talk through how to handle it differently. I genuinely care about getting it right.',
      },
      {
        questionId: 'q_success',
        scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
        question: 'How do you feel about it, and how does it affect the relationship?',
        answer: 'Proud. Completely. I am a teacher — I am never going to out-earn a corporate partner and I made peace with that a long time ago. Her success makes our life better. I would want to mark it properly — dinner, her favourite restaurant, telling her family. This is a big deal and I would treat it like one.',
      },
      {
        questionId: 'q_boundary',
        scenario: 'You want to be physical but your partner says she is not ready yet.',
        question: 'What do you do next, and how do you handle your own feelings about it?',
        answer: 'Respect it without a second thought. No means no and that is that — no conversation needed, no negotiating, no sulking. I would make sure she felt comfortable and that nothing changed between us. My own feelings are mine to manage. I do not take it personally.',
      },
      {
        questionId: 'q_household',
        scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
        question: 'What does a typical evening look like in your home when she is worn out?',
        answer: 'I cook most nights already — I genuinely enjoy it. On an evening like that I would make something she likes, let her rest, handle everything else. This is just what a partner does. I do not think about it as "helping" — it is just living together and taking care of each other.',
      },
      {
        questionId: 'q_friends',
        scenario: 'Your close friends make a sexist joke about women in the group chat.',
        question: 'What do you do in that moment, and why?',
        answer: 'I say something directly. I do this with my students when they say something they should not — you address it, you explain why, and you move on. Same with friends. I have lost a couple of acquaintances over this kind of thing and I am okay with that. I am not willing to perform silence to keep the peace.',
      },
      {
        questionId: 'q_feelings',
        scenario: 'You are going through a difficult time — work stress, family pressure.',
        question: 'How do you handle this with your partner?',
        answer: 'I share it pretty openly. I have seen too many men go silent and it destroys relationships. I tell her what is going on, what kind of support I need — sometimes it is just company, sometimes it is advice, sometimes I need to talk through it. I believe a relationship where both people can be vulnerable is the only kind worth having.',
      },
    ],
    qualityScores: {
      q1: 9, q2: 9, q3: 9, q4: 9, q5: 8, q6: 9, q7: 8, q8: 9,
      q9: 9, q10: 8, q11: 10, q12: 9, q13: 8, q14: 9, q15: 9, q16: 9,
      q17: 7, q18: 9, q19: 9, q20: 9, q21: 9, q22: 9, q23: 9,
    },
  },
];

// ─── Women ────────────────────────────────────────────────────────────────────

const WOMEN = [
  {
    user: {
      email: 'priya.patel@example.com',
      name: 'Priya Patel',
      age: 26,
      bio: 'UX designer. Dog mum. Love rooftop dinners and quiet Sunday mornings equally.',
      city: 'Bangalore',
    },
    // Safety & respect focused — must-haves: boundaries, no anger, protects not controls
    qualityWeights: {
      q1: 4, q2: 5, q3: 4, q4: 5, q5: 3, q6: 4, q7: 3, q8: 4,
      q9: 4, q10: 2, q11: 5, q12: 5, q13: 3, q14: 3, q15: 4, q16: 5,
      q17: 2, q18: 5, q19: 3, q20: 4, q21: 3, q22: 3, q23: 4,
    },
  },
  {
    user: {
      email: 'neha.gupta@example.com',
      name: 'Neha Gupta',
      age: 28,
      bio: 'Therapist by day, amateur baker by night. I value depth over everything.',
      city: 'Delhi',
    },
    // Emotional intelligence focused — must-haves: emotional expression, connection, patience
    qualityWeights: {
      q1: 4, q2: 3, q3: 4, q4: 4, q5: 5, q6: 3, q7: 5, q8: 5,
      q9: 5, q10: 4, q11: 4, q12: 5, q13: 3, q14: 5, q15: 4, q16: 4,
      q17: 2, q18: 5, q19: 3, q20: 4, q21: 3, q22: 4, q23: 5,
    },
  },
  {
    user: {
      email: 'ananya.reddy@example.com',
      name: 'Ananya Reddy',
      age: 31,
      bio: 'Product manager at a fintech startup. Organised, direct, and a firm believer in splitting bills.',
      city: 'Hyderabad',
    },
    // Practical partnership focused — must-haves: shares responsibilities, reliable, ambitious
    qualityWeights: {
      q1: 4, q2: 3, q3: 5, q4: 5, q5: 3, q6: 3, q7: 3, q8: 3,
      q9: 4, q10: 2, q11: 4, q12: 3, q13: 4, q14: 3, q15: 3, q16: 4,
      q17: 5, q18: 4, q19: 5, q20: 5, q21: 4, q22: 3, q23: 3,
    },
  },
  {
    user: {
      email: 'kavya.menon@example.com',
      name: 'Kavya Menon',
      age: 24,
      bio: 'Journalism student and part-time content writer. I notice everything and forget nothing.',
      city: 'Chennai',
    },
    // Character & trust focused — must-haves: trustworthy, stands up for her, never mocks women
    qualityWeights: {
      q1: 5, q2: 4, q3: 4, q4: 5, q5: 4, q6: 5, q7: 4, q8: 3,
      q9: 4, q10: 3, q11: 4, q12: 4, q13: 4, q14: 4, q15: 5, q16: 5,
      q17: 2, q18: 4, q19: 3, q20: 4, q21: 5, q22: 4, q23: 4,
    },
  },
  {
    user: {
      email: 'riya.kapoor@example.com',
      name: 'Riya Kapoor',
      age: 29,
      bio: 'Architect and part-time traveller. I have been to 14 countries solo and I am not stopping.',
      city: 'Mumbai',
    },
    // Balanced — values everything, slightly higher on confidence and humility
    qualityWeights: {
      q1: 4, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4, q7: 3, q8: 4,
      q9: 4, q10: 3, q11: 4, q12: 4, q13: 5, q14: 4, q15: 3, q16: 4,
      q17: 4, q18: 4, q19: 4, q20: 4, q21: 4, q22: 5, q23: 4,
    },
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const PASSWORD_HASH = await bcrypt.hash('Raj$2003', 12);
  console.log('Seeding fake profiles...\n');

  for (const m of MEN) {
    const existing = await prisma.user.findUnique({ where: { email: m.user.email } });
    if (existing) {
      console.log(`  skip  ${m.user.name} (already exists)`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        ...m.user,
        passwordHash: PASSWORD_HASH,
        role: 'MAN',
        photos: [],
        isVerified: true,
      },
    });

    await prisma.manProfile.create({
      data: {
        userId: user.id,
        qualityScores: m.qualityScores,
        quizAnswers: m.quizAnswers,
        communityScore: 0,
        ratingCount: 0,
      },
    });

    await prisma.onboardingResponse.create({
      data: {
        userId: user.id,
        role: 'MAN',
        responses: m.quizAnswers,
      },
    });

    console.log(`  ✓ ${m.user.name} — ${m.user.city}`);
  }

  for (const w of WOMEN) {
    const existing = await prisma.user.findUnique({ where: { email: w.user.email } });
    if (existing) {
      console.log(`  skip  ${w.user.name} (already exists)`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        ...w.user,
        passwordHash: PASSWORD_HASH,
        role: 'WOMAN',
        photos: [],
        isVerified: true,
      },
    });

    await prisma.womanProfile.create({
      data: {
        userId: user.id,
        qualityWeights: w.qualityWeights,
      },
    });

    const labeledResponses = Object.entries(w.qualityWeights).map(([key, weight]) => ({
      qualityKey: key,
      weight,
    }));

    await prisma.onboardingResponse.create({
      data: {
        userId: user.id,
        role: 'WOMAN',
        responses: labeledResponses,
      },
    });

    console.log(`  ✓ ${w.user.name} — ${w.user.city}`);
  }

  console.log('\nDone.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
