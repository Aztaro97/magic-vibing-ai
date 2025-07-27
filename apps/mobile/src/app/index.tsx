import React from "react";
import { Redirect } from "expo-router";

export default function index() {
  return <Redirect href="/(auth)/welcome" />;
}

// import React from "react";
// import { Text, View } from "@/components/ui";

// export default function index() {
//   return (
//     <View className="flex-1 items-center justify-center">
//       <Text>index</Text>
//     </View>
//   );
// }
