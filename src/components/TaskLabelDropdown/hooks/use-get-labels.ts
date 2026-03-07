import { useQuery } from "@tanstack/react-query";

import { getLabels } from "@/services/label.service";

export const useGetLabels = () => {
  return useQuery({
    queryKey: ["labels"],
    queryFn: getLabels,
  });
};
