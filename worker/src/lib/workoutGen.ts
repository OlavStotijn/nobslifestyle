import type { Env } from "../types";
import { generateJson } from "./aiText";
import { createSchema, addSchemaExercise } from "./schemas";
import { listExercises, createCustomExercise } from "./exercises";

export interface WorkoutGenInput {
  goal: string; // e.g. "strength", "hypertrophy", "fat loss", "general fitness"
  experience: "beginner" | "intermediate" | "advanced";
  equipment: string; // free text, e.g. "full gym", "dumbbells only", "bodyweight only"
  focus?: string; // optional free text, e.g. "upper body", "legs", "full body"
}

interface GeneratedExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weightKg: number;
}

interface GeneratedWorkout {
  schemaName: string;
  exercises: GeneratedExercise[];
}

const SCHEMA = {
  type: "object",
  properties: {
    schemaName: { type: "string" },
    exercises: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sets: { type: "integer" },
          repsMin: { type: "integer" },
          repsMax: { type: "integer" },
          weightKg: { type: "number" },
        },
        required: ["name", "sets", "repsMin", "repsMax", "weightKg"],
      },
    },
  },
  required: ["schemaName", "exercises"],
};

const SYSTEM_PROMPT = `You design workout routines for a fitness tracking app. Given a goal, experience
level, and available equipment, produce one complete routine: a short descriptive name and 4-8
exercises with sensible sets/rep ranges and a reasonable starting weight in kg for the stated
experience level (use 0 for bodyweight exercises). Only suggest exercises performable with the
stated equipment. Respond with nothing but the JSON object described.`;

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function resolveExerciseId(env: Env, userId: number, name: string): Promise<number> {
  const trimmed = name.trim().slice(0, 100) || "Exercise";
  const matches = await listExercises(env, userId, { q: trimmed });
  const exact = matches.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact.id;
  if (matches.length > 0) return matches[0].id;

  const created = await createCustomExercise(env, userId, { name: trimmed });
  return created.id;
}

export async function generateWorkout(env: Env, userId: number, input: WorkoutGenInput): Promise<{ schemaId: number }> {
  const userPrompt = `Goal: ${input.goal}
Experience: ${input.experience}
Equipment available: ${input.equipment}
${input.focus ? `Focus: ${input.focus}` : ""}`;

  const generated = await generateJson<GeneratedWorkout>(env, SYSTEM_PROMPT, userPrompt, SCHEMA);
  if (!Array.isArray(generated.exercises) || generated.exercises.length === 0) {
    throw new Error("Model returned no exercises.");
  }

  const schema = await createSchema(env, userId, {
    name: generated.schemaName?.trim().slice(0, 100) || "AI-generated routine",
  });

  for (const ex of generated.exercises) {
    const exerciseId = await resolveExerciseId(env, userId, ex.name);
    const sets = Math.min(10, Math.max(1, Math.round(toNumber(ex.sets, 3))));
    const repsMin = Math.max(1, Math.round(toNumber(ex.repsMin, 8)));
    const repsMax = Math.max(repsMin, Math.round(toNumber(ex.repsMax, repsMin + 4)));
    await addSchemaExercise(env, schema.id, {
      exerciseId,
      targetSets: sets,
      targetRepsMin: repsMin,
      targetRepsMax: repsMax,
      targetWeightKg: toNumber(ex.weightKg, 0),
    });
  }

  return { schemaId: schema.id };
}
