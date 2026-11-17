<script lang="ts">
  import { enhance } from '$app/forms';
  import { getLocaleStore } from '$lib/locale-context';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let saving = $state(false);
</script>

<h2>{nl ? 'Mededelingen' : 'Announcements'}</h2>
<div class="admin-recipe-grid announcement-admin">
  <aside>
    <a class="button" href="/admin/announcements">{nl ? 'Nieuwe mededeling' : 'New announcement'}</a>
    <ul class="admin-recipe-list">
      {#each data.rows as row (row.id)}
        <li><a href={`/admin/announcements?edit=${row.id}`} aria-current={data.selected?.id === row.id ? 'page' : undefined}>
          {row.title} <span class="small muted">· {row.published_at !== null ? (nl ? 'Gepubliceerd' : 'Published') : (nl ? 'Verborgen' : 'Hidden')}</span>
        </a></li>
      {:else}<li>{nl ? 'Nog geen mededelingen.' : 'No announcements yet.'}</li>{/each}
    </ul>
  </aside>
  <section class="card admin-editor">
    <h3>{data.selected ? (nl ? 'Mededeling bewerken' : 'Edit announcement') : (nl ? 'Mededeling toevoegen' : 'Add announcement')}</h3>
    {#if form?.error}<p role="alert" class="form-error">{form.error === 'conflict' ? (nl ? 'De mededeling is gewijzigd. Herlaad de pagina en probeer opnieuw.' : 'This announcement changed. Reload and try again.') : (nl ? 'Vul een titel en bericht in.' : 'Enter a title and message.')}</p>
    {:else if data.deleted}<p role="status" class="form-success">{nl ? 'Verwijderd.' : 'Deleted.'}</p>
    {:else if data.saved}<p role="status" class="form-success">{nl ? 'Opgeslagen.' : 'Saved.'}</p>{/if}
    {#key data.selected?.id}
      <form method="POST" action="?/save" class="form-grid" use:enhance={() => {
        saving = true;
        return async ({update}) => { try { await update({reset:false}); } finally { saving = false; } };
      }}>
        <input type="hidden" name="id" value={data.selected?.id ?? ''} />
        <input type="hidden" name="version" value={data.selected?.version ?? 0} />
        <label class="full">{nl ? 'Titel' : 'Title'}<input name="title" required maxlength="120" value={data.selected?.title ?? ''} /></label>
        <label class="full">{nl ? 'Bericht' : 'Message'}<textarea name="body" required maxlength="3000" rows="6" value={data.selected?.body ?? ''}></textarea></label>
        <label class="consent full"><input type="checkbox" name="published" checked={!data.selected || data.selected.published_at !== null} /><span>{nl ? 'Tonen op de homepage' : 'Show on the homepage'}</span></label>
        <button class="button" disabled={saving}>{saving ? (nl ? 'Opslaan…' : 'Saving…') : (nl ? 'Mededeling opslaan' : 'Save announcement')}</button>
      </form>
      {#if data.selected}
        <details class="announcement-delete">
          <summary>{nl ? 'Mededeling verwijderen' : 'Delete announcement'}</summary>
          <form method="POST" action="?/delete" use:enhance>
            <input type="hidden" name="id" value={data.selected.id} />
            <input type="hidden" name="version" value={data.selected.version} />
            <p>{nl ? 'Deze mededeling definitief verwijderen?' : 'Permanently delete this announcement?'}</p>
            <button class="button" disabled={saving}>{nl ? 'Definitief verwijderen' : 'Delete permanently'}</button>
          </form>
        </details>
      {/if}
    {/key}
  </section>
</div>

<style>
  .announcement-admin { margin-top: 20px; }
  .announcement-delete { margin-top: 24px; }
  .announcement-delete summary { cursor: pointer; color: var(--color-raspd); }
  .announcement-delete form { margin-top: 12px; }
</style>
