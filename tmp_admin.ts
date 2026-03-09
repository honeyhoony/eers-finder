import { createClient } from "@supabase/supabase-js";

async function main() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await supabase.from("profiles").update({ is_admin: true }).eq("email", "zzoajbh@naver.com");
    if (error) console.error(error);
    else console.log("Admin updated successfully", data);
}

main();
