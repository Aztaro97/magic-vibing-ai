// import type { AxiosError } from 'axios';
import { createQuery } from "react-query-kit";

// import { client } from '../common';
import type { Post } from "./types";

interface Variables {
  id: string;
}
type Response = Post;

export const usePost = createQuery<Response, Variables, any>({
  queryKey: ["posts"],
  fetcher: (variables) => {
    // return client
    //   .get(`posts/${variables.id}`)
    //   .then((response) => response.data);
    return fetch(`posts/${variables.id}`).then((response) => response.json());
  },
});
