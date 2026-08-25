/** @deprecated Taxonomy lives on GET /api/categories. Helpers remain for gradual imports. */
export {
  apiCategoryForFilter as filterKeyToApiCategory,
  parseCollectionFilterParam as searchParamToFilterKey,
  type CollectionFilterKey,
} from '../utils/catalogCategory';
