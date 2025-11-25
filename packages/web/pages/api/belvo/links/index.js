import { createClient } from '@supabase/supabase-js';

// Use service role for API routes (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organization_id } = req.query;

  if (!organization_id) {
    return res.status(400).json({ error: 'organization_id is required' });
  }

  try {
    const { data: links, error } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('organization_id', organization_id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch links' 
      });
    }

    console.log(`Found ${links?.length || 0} belvo links for organization ${organization_id}`);

    // Para cada link, buscar contas/cartões e determinar o nome da instituição
    const linksWithCounts = await Promise.all(
      (links || []).map(async (link) => {
        // Contar contas bancárias ativas
        const { count: accountCount, error: accountError } = await supabase
          .from('bank_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('belvo_link_id', link.link_id)
          .eq('organization_id', organization_id)
          .eq('is_active', true);

        if (accountError) {
          console.error(`Error counting accounts for link ${link.link_id}:`, accountError);
        }

        // Contar cartões ativos
        const { count: cardCount, error: cardError } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('belvo_link_id', link.link_id)
          .eq('organization_id', organization_id)
          .eq('is_active', true);

        if (cardError) {
          console.error(`Error counting cards for link ${link.link_id}:`, cardError);
        }

        // Determinar nome da instituição
        let institutionName = link.institution_name && link.institution_name !== 'Unknown'
          ? link.institution_name
          : null;

        if (!institutionName) {
          const { data: accountSample, error: accountSampleError } = await supabase
            .from('bank_accounts')
            .select('bank')
            .eq('belvo_link_id', link.link_id)
            .eq('organization_id', organization_id)
            .eq('is_active', true)
            .limit(1);

          if (accountSampleError) {
            console.error(`Error fetching account sample for link ${link.link_id}:`, accountSampleError);
          } else if (accountSample && accountSample.length > 0) {
            institutionName = accountSample[0].bank;
          }
        }

        if (!institutionName) {
          const { data: cardSample, error: cardSampleError } = await supabase
            .from('cards')
            .select('bank')
            .eq('belvo_link_id', link.link_id)
            .eq('organization_id', organization_id)
            .eq('is_active', true)
            .limit(1);

          if (cardSampleError) {
            console.error(`Error fetching card sample for link ${link.link_id}:`, cardSampleError);
          } else if (cardSample && cardSample.length > 0) {
            institutionName = cardSample[0].bank;
          }
        }

        const result = {
          ...link,
          institution_name: institutionName || link.institution_name || 'Instituição',
          accountCount: accountCount || 0,
          cardCount: cardCount || 0
        };
        console.log(`Link ${link.link_id} (${result.institution_name}): ${result.accountCount} accounts, ${result.cardCount} cards`);
        return result;
      })
    );

    console.log(`Returning ${linksWithCounts.length} links with counts`);

    return res.status(200).json({
      success: true,
      links: linksWithCounts
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

