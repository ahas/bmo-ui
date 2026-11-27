<!-- A list whose items come, go and change places while it is being read, each item keyed by its
     own lasting id and never by where it stands (`docs/design.md`, "Motion"). It moves by position
     alone, along the list's own axis: the items that stay slide to their new places within the list
     rather than jumping, an item that comes unfolds from nothing where it lands, and one that goes folds
     to nothing where it stood, so the items around it close up as it does (the moving-list module).
     A list the page moves as a whole, a head above it changing size, slides none of its items. How it
     fills is its own choice: read a page at a time, the first page fades in from its top item down and
     a page put at its end stands at once; an arrival of its own, they unfold too. -->
<script lang="ts">
import { MovingListGroup } from "../domain/moving-list-group";

export default MovingListGroup;
</script>
