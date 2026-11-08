insert into public.project_types (name, description, sequence)
values
  ('Automacao', 'Automacao de processos e rotinas de negocio.', 10),
  ('Implementacao', 'Implementacao de sistema, modulo ou solucao.', 20),
  ('Integracao', 'Integracao entre sistemas, APIs ou plataformas.', 30),
  ('Melhoria evolutiva', 'Evolucao funcional de uma solucao existente.', 40),
  ('Infraestrutura', 'Projetos de infraestrutura, redes, nuvem ou datacenter.', 50),
  ('Dados e BI', 'Dados, analytics, indicadores e business intelligence.', 60),
  ('Seguranca da informacao', 'Seguranca, risco, identidade e conformidade.', 70),
  ('Atualizacao tecnologica', 'Upgrade, modernizacao ou substituicao tecnologica.', 80),
  ('Desenvolvimento', 'Desenvolvimento de aplicacao ou produto digital.', 90)
on conflict (name) do update
set description = excluded.description,
    sequence = excluded.sequence,
    active = true,
    updated_at = now();
