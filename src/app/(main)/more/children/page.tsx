import ChildManager from "@/components/ChildManager";
import { SubHeader } from "@/components/ui";
import { getChildren } from "@/lib/data";

export default async function ChildrenPage() {
  const children = await getChildren();
  return (
    <>
      <SubHeader title="아이 관리" back="/more" />
      <ChildManager items={children} />
    </>
  );
}
