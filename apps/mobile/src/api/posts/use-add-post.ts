// import type { AxiosError } from 'axios';
import { createMutation } from "react-query-kit";

import type { Post } from "./types";

interface Variables {
  title: string;
  body: string;
  userId: number;
}
type Response = Post;

export const useAddPost = createMutation<Response, Variables, any>({
  mutationFn: async (variables) =>
    // client({
    // url: 'posts/add',
    // method: 'POST',
    // data: variables,
    // }).then((response) => response.data),
    fetch(`posts/add`, {
      method: "POST",
      body: JSON.stringify(variables),
    }).then((response) => response.json()),
});
