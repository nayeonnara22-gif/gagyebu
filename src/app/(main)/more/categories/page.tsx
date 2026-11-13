import CategoryManager from "@/components/CategoryManager";
import { SubHeader } from "@/components/ui";
import { getCategories } from "@/lib/data";

export default async function CategoriesPage() {
  const categories = await getCategories(true);
  return (
    <>
      <SubHeader title="카테고리 관리" back="/more" />
      <CategoryManager categories={categories} />
    </>
  );
}
