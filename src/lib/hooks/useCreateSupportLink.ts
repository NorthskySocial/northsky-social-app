import {useCallback} from 'react'

// northsky: `msg`, `useLingui`, and `useSession` come back with the Zendesk
// pre-fill below.
import {BRAND} from '#/brand/config'

export const ZENDESK_SUPPORT_URL = BRAND.feedbackUrl // northsky: brand override

export enum SupportCode {
  AA_DID = 'AA_DID',
  AA_BIRTHDATE = 'AA_BIRTHDATE',
}

/**
 * {@link https://support.zendesk.com/hc/en-us/articles/4408839114522-Creating-pre-filled-ticket-forms}
 */
export function useCreateSupportLink() {
  /**
   * northsky: the brand form is not Zendesk and does not accept pre-filled
   * ticket fields. Do not put the email, the handle, or the DID in the URL.
   * The upstream signature stays so the Zendesk pre-fill can come back.
   */
  return useCallback((_prefill: {code: SupportCode; email?: string}) => {
    const url = new URL(ZENDESK_SUPPORT_URL)
    /* northsky: upstream Zendesk pre-fill. Restore it with a Zendesk form.
    if (currentAccount) {
      url.search = new URLSearchParams({
        tf_anonymous_requester_email: email || currentAccount.email || '', // email will be defined
        tf_description:
          `[Code: ${code}] - ` + _(msg`Please write your message below:`),
        tf_17205412673421: currentAccount.handle + ` (${currentAccount.did})`,
      }).toString()
    }
    */
    return url.toString()
  }, [])
}
