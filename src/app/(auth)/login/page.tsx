import { LoginForm } from "./LoginForm";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorParam = params?.error ?? null;

  return (
    <LoginForm initialError={errorParam} />
  );
}
