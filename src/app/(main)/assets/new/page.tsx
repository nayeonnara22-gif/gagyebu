import AccountForm from "@/components/AccountForm";
import { SubHeader } from "@/components/ui";

export default function NewAccountPage() {
  return (
    <>
      <SubHeader title="계좌 추가" back="/assets" />
      <AccountForm />
    </>
  );
}
