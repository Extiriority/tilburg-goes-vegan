<script lang="ts">
  let { name, label, nl, value = '', defaultTime = '19:00' }: {
    name: string; label: string; nl: boolean; value?: string; defaultTime?: string;
  } = $props();
</script>
<fieldset class="admin-date-time">
  <legend>{label}</legend>
  <div>
    <label>{nl ? 'Datum' : 'Date'}<input type="date" name={`${name}Date`} value={value.slice(0,10)} required /></label>
    <label>{nl ? 'Tijd (24 uur)' : 'Time (24h)'}<input type="text" name={`${name}Time`} value={value.slice(11,16) || defaultTime}
      inputmode="numeric" maxlength="5" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00"
      title={nl ? '24-uursnotatie, bijvoorbeeld 19:00' : '24-hour time, for example 19:00'} required
      oninput={(event) => { const field=event.currentTarget; if (/^\d{4}$/.test(field.value)) field.value=`${field.value.slice(0,2)}:${field.value.slice(2)}`; }} /></label>
  </div>
</fieldset>
