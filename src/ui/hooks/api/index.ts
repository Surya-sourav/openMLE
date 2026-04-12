import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export * from './ml-agent';
import type { Connection } from 'src/electron/internal-database/schemas';
import type { CreateConnection } from 'src/electron/interfaces/requests/create-connection.request';

/* Get All Connections */
export function useAPIGetAllConnections(props: Partial<UseQueryOptions<Connection[], Error>>) {
  const query = useQuery({
    queryKey: ['database'],
    queryFn: () => window.database.getAll(),
    ...props,
  });

  return query;
}

type SaveConnectionVariables = {
  connection: CreateConnection;
  setAsDefault: boolean;
};

type SaveConnectionOptions = Omit<
  UseMutationOptions<Connection, Error, SaveConnectionVariables, unknown>,
  'mutationFn'
>;

/* Save Connection */
export function useAPISaveConnection(props: Partial<SaveConnectionOptions> = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = props;
  const query = useMutation<Connection, Error, SaveConnectionVariables, unknown>({
    mutationFn: ({ connection, setAsDefault }) =>
      window.database.saveConnection(connection, setAsDefault),
    ...rest,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: ['database'] });
      onSuccess?.(data, variables, context, mutation);
    },
  });

  return query;
}

/* Set Default Connection */
export function useAPISetDefaultConnection(
  options: {
    id: number;
  },
  props: Partial<UseMutationOptions<{ success: boolean }, Error, { id: number }>>,
) {
  const queryClient = useQueryClient();
  const query = useMutation({
    mutationFn: () => window.database.setDefaultConnection(options.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database'] });
    },
    ...props,
  });

  return query;
}

/* Connect to Database */
export function useAPIConnect(
  options: {
    id: number;
  },
  props: Partial<UseMutationOptions<{ success: boolean }, Error, { id: number }>>,
) {
  const queryClient = useQueryClient();
  const query = useMutation({
    mutationFn: () => window.database.connect(options.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database'] });
    },
    ...props,
  });

  return query;
}

/* Disconnect from Database */
export function useAPIDisconnect(
  options: {
    id: number;
  },
  props: Partial<UseMutationOptions<{ success: boolean }, Error, { id: number }>>,
) {
  const queryClient = useQueryClient();
  const query = useMutation({
    mutationFn: () => window.database.disconnect(options.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database'] });
    },
    ...props,
  });

  return query;
}

/* Delete Connection */
export function useAPIDeleteConnection(
  props: Partial<UseMutationOptions<boolean, Error, { id: number }>> = {},
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = props;

  const query = useMutation<boolean, Error, { id: number }>({
    mutationFn: ({ id }) => window.database.deleteConnection(id),
    ...rest,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: ['database'] });
      onSuccess?.(data, variables, context, mutation);
    },
  });

  return query;
}
